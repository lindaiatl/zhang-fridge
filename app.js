// 张家大冰箱网页版：页面逻辑
// 冰箱（吃多少记多少、冷藏/冷冻）、一周食谱、家庭（购买清单、买到入库）、营养大盘
(function () {
  const { parseItem, nutritionFor, shelfDays, canFreeze, isSeasoning, toGrams, lookup, formatQty, todayString } = window.Foods;
  const $ = (id) => document.getElementById(id);

  // 每人每天的参考摄入量
  // - 填了体重：热量 = 体重(公斤) × 30 千卡，蛋白质 = 体重(公斤) × 1 克（轻体力活动的成年人）
  // - 没填体重：按成年人平均 2000 千卡、60 克
  // 全家参考量 = 每个人的参考量加起来
  const KCAL_PER_PERSON = 2000;
  const PROTEIN_PER_PERSON = 60;
  const KCAL_PER_KG = 30;
  const PROTEIN_PER_KG = 1;

  function personGoal(member) {
    const w = member && member.weight;
    if (w > 0) return { kcal: Math.round(w * KCAL_PER_KG), protein: Math.round(w * PROTEIN_PER_KG), byWeight: true };
    return { kcal: KCAL_PER_PERSON, protein: PROTEIN_PER_PERSON, byWeight: false };
  }

  // 每个称呼对应的小头像
  const OWNER_AVATARS = {
    '宝贝': '👶', '爸爸': '👨', '妈妈': '👩', '老公': '👨', '老婆': '👩', '爷爷': '👴', '奶奶': '👵', '外公': '👴', '外婆': '👵',
    '哥哥': '🧑', '姐姐': '👩', '弟弟': '👦', '妹妹': '👧', '全家': '🏠',
  };
  const WHO_CHOICES = ['老公', '老婆', '爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆', '哥哥', '姐姐', '弟弟', '妹妹', '宝贝'];

  // 家庭名：每家自己起，比如"李家大冰箱"；还没起名时显示"家庭大冰箱"
  const DEFAULT_FAMILY_NAME = '家庭大冰箱';
  function familyName() {
    const settings = Store.get('settings') || {};
    return settings.familyName || DEFAULT_FAMILY_NAME;
  }

  function renderFamilyName() {
    const name = familyName();
    document.querySelectorAll('.family-name').forEach((el) => {
      el.textContent = name;
    });
    document.title = name;
  }

  // 这台设备上的"我"是成员列表里的哪一位（还没选称呼时是 null）
  function me() {
    return Store.get('members').find((m) => m.id === Store.deviceId) || null;
  }
  function myName() {
    const m = me();
    return m ? m.name : '我';
  }

  // 把文字里的 < > & 等特殊符号转义，防止输入的内容被当成网页代码
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  // 去掉名字里的数量部分，例如 "🥚 农家土鸡蛋 (10个)" → "🥚 农家土鸡蛋"
  function shortName(name) {
    return name.split('(')[0].split('（')[0].trim();
  }

  // ---------- 轻提示 ----------
  let toastTimer = null;
  function showToast(text, duration) {
    const toast = $('toast');
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, duration || 1500);
  }

  // ---------- 底部标签切换 ----------
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.page').forEach((page) => {
        page.classList.toggle('active', page.id === 'page-' + tab.dataset.page);
      });
      window.scrollTo(0, 0);
      // 打开食谱页时补查一次：之前排的菜如果还缺食材，补进购买清单
      if (tab.dataset.page === 'menu') {
        const { added } = syncShoppingWithMenu();
        if (added.length) showToast(`食谱里还缺的食材已放进购买清单：\n${added.join('、')}`, 3500);
      }
    });
  });

  // ---------- 🏠 共享大冰箱 ----------

  // 把日期往后推几天，返回 2026-10-10 这样的格式
  function addDays(dateString, days) {
    const d = new Date(dateString + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // 旧数据的数量写在名字里（如 "🥚 农家土鸡蛋 (10个)"），这里统一拆成 名字 + 数量 + 单位
  function normalizeFood(food) {
    let f = food;
    if (f.qty == null) {
      const parsed = parseItem(f.name);
      f = Object.assign({}, f, { name: parsed.name, qty: parsed.qty, unit: parsed.unit });
    }
    if (!f.storage) f = Object.assign({}, f, { storage: '冷藏' });
    // 入库时的数量：用来判断"吃过一部分"
    if (f.initialQty == null) f = Object.assign({}, f, { initialQty: f.qty });
    return f;
  }

  function getFoods() {
    return Store.get('foodList').map(normalizeFood);
  }

  function saveFoods(foods) {
    Store.set('foodList', foods);
  }

  // 根据保质期算出还剩几天，以及显示的颜色
  function remainingInfo(expireDate) {
    const today = new Date(todayString() + 'T00:00:00');
    const expire = new Date(expireDate + 'T00:00:00');
    const days = Math.round((expire - today) / 86400000);
    let cls = 'green';
    if (days <= 2) cls = 'red';
    else if (days <= 5) cls = 'orange';
    const text = days < 0 ? `⚠️ 已过期 ${-days} 天` : `⏱️ 剩 ${days} 天`;
    return { days, cls, text };
  }

  function renderFridge() {
    // 快过期的排在前面；调料单独放在下面的调料区
    const all = getFoods().sort((a, b) =>
      a.expireDate < b.expireDate ? -1 : a.expireDate > b.expireDate ? 1 : 0
    );
    const foods = all.filter((f) => !isSeasoning(f.name));
    const seasonings = all.filter((f) => isSeasoning(f.name));

    const editButtons = (food) => `
      <button class="small-button" data-action="qty" data-id="${escapeHtml(food.id)}">✏️ 改数量</button>
      <button class="small-button gray" data-action="delete" data-id="${escapeHtml(food.id)}">🗑 删除</button>`;

    $('food-list').innerHTML = foods.length
      ? foods
          .map((food) => {
            const remain = remainingInfo(food.expireDate);
            const frozen = food.storage === '冷冻';
            const partial = food.qty < food.initialQty;
            const freezeButton =
              frozen || canFreeze(food.name)
                ? `<button class="small-button" data-action="storage" data-id="${escapeHtml(food.id)}">${frozen ? '🧊 改冷藏' : '❄️ 冻起来'}</button>`
                : '';
            return `
          <div class="food-card ${frozen ? 'frozen-card' : ''} ${partial ? 'partial-card' : ''}">
            <div class="food-info">
              <div class="food-name">${escapeHtml(food.name)} <span class="food-qty">${partial ? '还剩 ' : ''}${formatQty(food.qty)}${escapeHtml(food.unit)}</span>${partial ? ' <span class="partial-tag">已吃一部分</span>' : ''}</div>
              <div class="food-details">
                <span class="storage-tag ${frozen ? 'frozen' : ''}">${frozen ? '❄️ 冷冻' : '🧊 冷藏'}</span>
                <label class="remaining-days ${remain.cls}" title="点一下修改到期日">
                  ${remain.text} ✏️
                  <input type="date" class="date-input" data-id="${escapeHtml(food.id)}" value="${escapeHtml(food.expireDate)}" />
                </label>
                <span class="added-by">[👤 ${escapeHtml(food.addedBy)}]</span>
              </div>
              <div class="card-actions">${freezeButton}${editButtons(food)}</div>
            </div>
            <button class="finish-button" data-action="eat" data-id="${escapeHtml(food.id)}">吃</button>
          </div>`;
          })
          .join('')
      : '<p class="empty-text">冰箱空空的。去"我的家庭"把买到的食材入库吧。</p>';

    $('seasoning-card').hidden = seasonings.length === 0;
    $('seasoning-list').innerHTML = seasonings
      .map(
        (food) => `
          <div class="seasoning-row">
            <span class="seasoning-name">${escapeHtml(food.name)} <span class="food-qty">${formatQty(food.qty)}${escapeHtml(food.unit)}</span></span>
            <button class="small-button" data-action="qty" data-id="${escapeHtml(food.id)}">✏️</button>
            <button class="small-button gray" data-action="usedup" data-id="${escapeHtml(food.id)}">用完了</button>
          </div>`
      )
      .join('');
  }

  // 改数量和单位：比如西瓜改成"1个"、水改成"1箱"或"6瓶"
  function editQuantity(id) {
    const food = getFoods().find((f) => f.id === id);
    if (!food) return;
    const input = prompt(`${food.name} 现在有多少？（例如：1个、1箱、6瓶、0.5斤）`, `${formatQty(food.qty)}${food.unit}`);
    if (input == null) return;
    const text = input.trim();
    if (!text) return;
    // 只写数字时保留原来的单位
    const parsed = /^\d+(\.\d+)?$/.test(text) ? { qty: parseFloat(text), unit: food.unit } : parseItem(`${food.name} ${text}`);
    if (!(parsed.qty > 0) || parsed.name === `${food.name} ${text}`.trim()) {
      showToast('没看懂，请写成"数字 + 单位"，如：1箱', 2500);
      return;
    }
    saveFoods(
      getFoods().map((f) =>
        f.id === id ? Object.assign({}, f, { qty: parsed.qty, unit: parsed.unit, initialQty: parsed.qty }) : f
      )
    );
    showToast(`已改成 ${formatQty(parsed.qty)}${parsed.unit}`);
  }

  // 删除：买错了、扔掉了、调料用完了（不计入营养）
  function removeFood(id, ask) {
    const food = getFoods().find((f) => f.id === id);
    if (!food) return;
    if (ask && !confirm(`从冰箱里删除「${food.name}」吗？\n（不会计入营养，适合买错了或扔掉的）`)) return;
    saveFoods(getFoods().filter((f) => f.id !== id));
    showToast(`已删除：${food.name}`);
  }

  // 冷藏 ⇄ 冷冻：从今天起按新的存放方式重新计算到期日
  function toggleStorage(id) {
    const foods = getFoods().map((f) => {
      if (f.id !== id) return f;
      const storage = f.storage === '冷冻' ? '冷藏' : '冷冻';
      return Object.assign({}, f, { storage, expireDate: addDays(todayString(), shelfDays(f.name, storage)) });
    });
    saveFoods(foods);
    const food = foods.find((f) => f.id === id);
    showToast(`${food.name}已${food.storage === '冷冻' ? '放进冷冻室' : '改为冷藏'}，到期日已更新`, 2000);
  }

  function onFridgeClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'eat') openEatModal(id);
    if (action === 'storage') toggleStorage(id);
    if (action === 'qty') editQuantity(id);
    if (action === 'delete') removeFood(id, true);
    if (action === 'usedup') removeFood(id, false);
  }
  $('food-list').addEventListener('click', onFridgeClick);
  $('seasoning-list').addEventListener('click', onFridgeClick);

  // 手动修改到期日
  $('food-list').addEventListener('change', (e) => {
    if (!e.target.classList.contains('date-input') || !e.target.value) return;
    const id = e.target.dataset.id;
    saveFoods(getFoods().map((f) => (f.id === id ? Object.assign({}, f, { expireDate: e.target.value }) : f)));
    showToast('到期日已修改');
  });

  // ---------- 🍽️ 吃了多少 ----------
  let eatingId = null;

  function openEatModal(id) {
    const food = getFoods().find((f) => f.id === id);
    if (!food) return;
    eatingId = id;
    $('eat-title').textContent = `🍽️ ${food.name}`;
    $('eat-left').textContent = `冰箱里还有 ${formatQty(food.qty)}${food.unit}，这次吃了多少？`;
    $('eat-unit').textContent = food.unit;
    $('eat-amount').value = '';
    // 快捷按钮：全部、一半，数量大于 1 时再给一个"1 个单位"
    const quick = [
      { label: '全部吃光', qty: food.qty },
      { label: '吃了一半', qty: food.qty / 2 },
    ];
    if (food.qty > 1) quick.push({ label: `吃了 1${food.unit}`, qty: 1 });
    $('eat-quick').innerHTML = quick
      .map((q) => `<button class="who-option" data-qty="${q.qty}">${escapeHtml(q.label)}</button>`)
      .join('');
    $('eat-modal').hidden = false;
  }

  function eatAmount(qty) {
    const foods = getFoods();
    const food = foods.find((f) => f.id === eatingId);
    if (!food) return;
    if (!(qty > 0)) {
      showToast('请填写吃了多少');
      return;
    }
    // 不能吃得比冰箱里还多
    const eaten = Math.min(qty, food.qty);
    const left = Math.round((food.qty - eaten) * 100) / 100;
    const nutrition = nutritionFor(food.name, eaten, food.unit);
    const record = {
      id: `eaten-${Date.now()}`,
      name: food.name,
      qty: eaten,
      unit: food.unit,
      // 记在"谁吃的"名下：哪台手机点的"吃"，就算谁的
      owner: myName(),
      eaterId: Store.deviceId,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      known: nutrition.known,
      date: todayString(),
    };
    Store.set('eatenLog', Store.get('eatenLog').concat(record));
    // 吃完了就从冰箱拿掉，没吃完就留下剩余的量
    saveFoods(
      left > 0
        ? foods.map((f) => (f.id === food.id ? Object.assign({}, f, { qty: left }) : f))
        : foods.filter((f) => f.id !== food.id)
    );
    $('eat-modal').hidden = true;

    const amountText = `${formatQty(eaten)}${food.unit}`;
    const leftText = left > 0 ? `，还剩 ${formatQty(left)}${food.unit}` : '，已吃光';
    showToast(
      record.known
        ? `吃了 ${amountText}：+${record.kcal} 千卡，蛋白质 ${record.protein} 克${leftText}`
        : `吃了 ${amountText}（营养还没收录）${leftText}`,
      2500
    );
  }

  $('eat-quick').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-qty]');
    if (button) eatAmount(parseFloat(button.dataset.qty));
  });
  $('eat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    eatAmount(parseFloat($('eat-amount').value));
  });
  $('eat-cancel').addEventListener('click', () => {
    $('eat-modal').hidden = true;
  });

  // ---------- 📅 一周家庭食谱 ----------
  const MEALS = ['早餐', '午餐', '晚餐'];
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  // 按重量的单位：生成清单时保留一位小数；其他单位（个、盒…）向上取整
  const WEIGHT_UNIT_SET = { 斤: true, 两: true, 公斤: true, 千克: true, kg: true, 克: true, g: true };
  let weekOffset = 0; // 0 = 本周，1 = 下周
  let pickingSlot = null; // 正在加菜的 { date, meal }

  // 某一周的周一到周日
  function weekDates(offset) {
    const today = new Date(todayString() + 'T00:00:00');
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
  }

  function getPlan() {
    return Store.get('mealPlan') || {};
  }

  function renderMenu() {
    const plan = getPlan();
    const dates = weekDates(weekOffset);
    const today = todayString();
    $('week-range').textContent = `${dates[0].slice(5)} ～ ${dates[6].slice(5)} · 每天排一日三餐`;
    $('menu-days').innerHTML = dates
      .map((date) => {
        const d = new Date(date + 'T00:00:00');
        const day = plan[date] || {};
        const rows = MEALS.map((meal) => {
          const chips = (day[meal] || [])
            .map(
              (dish, i) =>
                `<span class="dish-chip">${escapeHtml(dish.name)}<button class="chip-x" data-action="remove" data-date="${date}" data-meal="${meal}" data-index="${i}" aria-label="删除">✕</button></span>`
            )
            .join('');
          return `
            <div class="meal-row">
              <span class="meal-label">${meal}</span>
              <div class="meal-dishes">
                ${chips}
                <button class="add-dish" data-action="add" data-date="${date}" data-meal="${meal}">＋ 加菜</button>
              </div>
            </div>`;
        }).join('');
        return `
          <div class="card day-card ${date === today ? 'today' : ''} ${date < today ? 'past' : ''}">
            <div class="day-title">${WEEKDAYS[d.getDay()]} <span class="day-date">${date.slice(5)}</span>${date === today ? ' <span class="me-tag">今天</span>' : ''}</div>
            ${rows}
          </div>`;
      })
      .join('');
  }

  document.querySelectorAll('.week-button').forEach((button) => {
    button.addEventListener('click', () => {
      weekOffset = parseInt(button.dataset.week, 10);
      document.querySelectorAll('.week-button').forEach((b) => b.classList.toggle('active', b === button));
      renderMenu();
    });
  });

  function setDishes(date, meal, update) {
    const plan = Object.assign({}, getPlan());
    const day = Object.assign({}, plan[date] || {});
    day[meal] = update((day[meal] || []).slice());
    plan[date] = day;
    // 顺手清掉一个月以前的旧食谱，免得数据越存越多
    const cutoff = addDays(todayString(), -30);
    Object.keys(plan).forEach((k) => {
      if (k < cutoff) delete plan[k];
    });
    Store.set('mealPlan', plan);
  }

  $('menu-days').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const { date, meal } = button.dataset;
    if (button.dataset.action === 'remove') {
      const index = parseInt(button.dataset.index, 10);
      const removedDish = ((getPlan()[date] || {})[meal] || [])[index];
      setDishes(date, meal, (dishes) => dishes.filter((_, i) => i !== index));
      // 删菜后，不再需要的食材从购买清单去掉；别的菜还要用的会留着
      const { removed, added } = syncShoppingWithMenu();
      if (removed.length || added.length) {
        showToast(
          `已删除：${removedDish ? removedDish.name : '这道菜'}\n购买清单已更新${removed.length ? `，去掉：${removed.join('、')}` : ''}${added.length ? `，现在需要：${added.join('、')}` : ''}`,
          3500
        );
      }
    }
    if (button.dataset.action === 'add') openDishModal(date, meal);
  });

  function openDishModal(date, meal) {
    pickingSlot = { date, meal };
    const d = new Date(date + 'T00:00:00');
    $('dish-title').textContent = `给${WEEKDAYS[d.getDay()]}${meal}加菜`;
    // 先列这一顿常吃的，再列其他的（早餐吃面条、晚餐吃饺子也行）
    const primary = Recipes.list(meal);
    const names = primary.map((r) => r.name);
    const recipes = primary.concat(Recipes.list().filter((r) => names.indexOf(r.name) === -1));
    $('dish-options').innerHTML = recipes
      .map((r) => `<button class="who-option" data-recipe="${escapeHtml(r.name)}">${escapeHtml(r.name)}</button>`)
      .join('');
    $('custom-dish-name').value = '';
    $('custom-dish-items').value = '';
    $('dish-modal').hidden = false;
  }

  function addDish(dish) {
    const { date, meal } = pickingSlot;
    setDishes(date, meal, (dishes) => dishes.concat(dish));
    $('dish-modal').hidden = true;
    // 过去的日子不用再买菜
    const added = date >= todayString() ? syncShoppingWithMenu().added : [];
    showToast(
      added.length
        ? `已加入：${dish.name}\n冰箱里没有的已放进购买清单：${added.join('、')}`
        : `已加入：${dish.name}（食材冰箱里都有）`,
      3000
    );
  }

  $('dish-options').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-recipe]');
    if (!button) return;
    const recipe = Recipes.find(button.dataset.recipe);
    if (recipe) addDish({ name: recipe.name, items: recipe.items });
  });

  $('custom-dish-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('custom-dish-name').value.trim();
    if (!name) {
      showToast('请写菜名');
      return;
    }
    addDish({ name, items: Recipes.parseIngredients($('custom-dish-items').value) });
  });

  $('dish-cancel').addEventListener('click', () => {
    $('dish-modal').hidden = true;
  });

  // 同一种食材的"归类名"：猪肉、五花肉、肉末都算同一类，这样冰箱里有就能扣掉
  function foodKey(name) {
    const food = lookup(name);
    return food.known ? food.keywords[0] : name.trim();
  }

  // 让购买清单跟着食谱走：今天以后排好的所有菜 → 需要的食材 → 扣掉冰箱里和清单上已有的 → 清单里只留缺的
  // - 食谱自动加的、还没勾选的条目会按"现在还缺多少"重新计算（删菜后不再需要的就去掉）
  // - 手动添加的、已经勾选"买到了"的条目都不动
  // - 一种食材如果别的菜还要用，就不会被去掉
  // 返回 { added, removed }：这次新加的和去掉的食材文字
  function syncShoppingWithMenu() {
    const before = Store.get('shoppingList');
    const isAuto = (i) => i.requester === '食谱需要' && !i.bought;
    const kept = before.filter((i) => !isAuto(i));
    const plan = getPlan();
    const today = todayString();
    const need = {}; // 归类名 → { name, unit, amount（能换算成克就按克，否则按单位个数）, byWeight }

    Object.keys(plan)
      .filter((date) => date >= today)
      .forEach((date) => {
        MEALS.forEach((meal) => {
          ((plan[date] || {})[meal] || []).forEach((dish) => {
            (dish.items || []).forEach(({ name, qty, unit }) => {
              const key = foodKey(name);
              const grams = toGrams(name, qty, unit);
              if (!need[key]) need[key] = { name, unit, amount: 0, byWeight: grams > 0 };
              const n = need[key];
              n.amount += n.byWeight ? grams : unit === n.unit ? qty : 0;
            });
          });
        });
      });

    // 已经有的量：冰箱里的 + 清单上留着的（手动加的、已经勾选买到的）
    const haveItems = getFoods()
      .map((f) => ({ name: f.name, qty: f.qty, unit: f.unit }))
      .concat(kept.map((i) => parseItem(i.name)));
    function haveAmount(key, n) {
      return haveItems.reduce((total, item) => {
        if (foodKey(item.name) !== key) return total;
        if (n.byWeight) return total + toGrams(item.name, item.qty, item.unit);
        return item.unit === n.unit ? total + item.qty : total;
      }, 0);
    }

    const newItems = [];
    Object.keys(need).forEach((key, i) => {
      const n = need[key];
      const shortage = n.amount - haveAmount(key, n);
      if (shortage <= 0.0001) return;
      // 换回原来的单位：按个数的向上取整，按重量的保留一位小数
      let qty = n.byWeight ? shortage / toGrams(n.name, 1, n.unit) : shortage;
      qty = WEIGHT_UNIT_SET[n.unit] ? Math.ceil(qty * 10 - 0.0001) / 10 : Math.ceil(qty - 0.0001);
      const text = `${n.name} ${formatQty(qty)}${n.unit}`;
      // 原来就有一模一样的条目就沿用它（保留原来的位置和编号）
      const same = before.find((item) => isAuto(item) && item.name === text);
      newItems.push(same || { id: `menu-${Date.now()}-${i}`, name: text, requester: '食谱需要', bought: false });
    });

    const oldTexts = before.filter(isAuto).map((i) => i.name);
    const newTexts = newItems.map((i) => i.name);
    const added = newTexts.filter((t) => oldTexts.indexOf(t) === -1);
    const removed = oldTexts.filter((t) => newTexts.indexOf(t) === -1);
    if (added.length || removed.length) Store.set('shoppingList', kept.concat(newItems));
    return { added, removed };
  }

  // ---------- 👥 我的家庭 ----------

  function renderFamily() {
    $('family-id').textContent = Store.isCloud ? `📌 ${Store.familyId}` : '📌 本机模式';

    const members = Store.get('members');
    $('member-list').innerHTML = members.length
      ? members
          .map(
            (m) => `
          <div class="member-item">
            <span class="member-avatar">${escapeHtml(m.avatar)}</span>
            <span class="member-name">${escapeHtml(m.name)}</span>
            <span class="member-role">(${escapeHtml(m.role)})${m.weight ? ` ${formatQty(m.weight)}公斤` : ''}</span>
            ${Store.isCloud && m.id === Store.deviceId ? '<span class="me-tag">我</span><span class="member-buttons"><button class="rename-button">改称呼</button><button class="weight-button">⚖️ 体重</button></span>' : ''}
          </div>`
          )
          .join('')
      : '<p class="empty-text">还没有成员。</p>';

    const items = Store.get('shoppingList');
    if (items.length === 0) {
      $('shopping-list').innerHTML = '<p class="empty-text">购买清单是空的。</p>';
      return;
    }
    $('shopping-list').innerHTML = items
      .map(
        (item) => `
          <label class="shopping-item">
            <input type="checkbox" data-id="${escapeHtml(item.id)}" ${item.bought ? 'checked' : ''} />
            <span class="shopping-item-text ${item.bought ? 'bought-item' : ''}">
              ${escapeHtml(item.name)}  [${escapeHtml(item.requester)}]
            </span>
          </label>`
      )
      .join('');
  }

  // 勾选 / 取消勾选"已买到"
  $('shopping-list').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const id = e.target.dataset.id;
    let changed = null;
    const items = Store.get('shoppingList').map((item) => {
      if (item.id !== id) return item;
      changed = Object.assign({}, item, { bought: e.target.checked });
      return changed;
    });
    Store.set('shoppingList', items);
    if (changed) {
      showToast(changed.bought ? `${shortName(changed.name)}已买到！` : `${shortName(changed.name)}取消购买`);
    }
  });

  // 手动添加要买的食材
  $('add-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('new-item-input');
    const name = input.value.trim();
    if (!name) {
      showToast('请输入食材名称');
      return;
    }
    Store.set(
      'shoppingList',
      Store.get('shoppingList').concat({ id: `item-${Date.now()}`, name, requester: `${myName()}需要`, bought: false })
    );
    input.value = '';
    showToast('添加成功！');
  });

  // 买到：勾选的食材进冰箱，从购买清单移除
  $('confirm-purchase').addEventListener('click', () => {
    const items = Store.get('shoppingList');
    const bought = items.filter((item) => item.bought);
    if (bought.length === 0) {
      showToast('没有勾选任何已购买物品', 2000);
      return;
    }
    const newFoods = bought.map((item, i) => {
      const parsed = parseItem(item.name);
      return {
        id: `${item.id}-${Date.now()}-${i}`,
        name: parsed.name,
        qty: parsed.qty,
        unit: parsed.unit,
        storage: '冷藏',
        // 按食材自己的冷藏天数算到期日，比如鱼 2 天、鸡蛋 30 天
        expireDate: addDays(todayString(), shelfDays(parsed.name, '冷藏')),
        addedBy: `${myName()}买入`,
        owner: '全家',
      };
    });
    saveFoods(getFoods().concat(newFoods));
    Store.set('shoppingList', items.filter((item) => !item.bought));
    showToast(`${bought.map((item) => shortName(item.name)).join('、')}已入库！可前往"共享大冰箱"查看`, 2500);
  });

  // 填自己的体重：营养大盘按体重算每个人的参考热量和蛋白质
  $('member-list').addEventListener('click', (e) => {
    if (!e.target.closest('.weight-button')) return;
    const mine = me();
    if (!mine) return;
    const input = prompt(
      `你的体重是多少公斤？\n（用来算每天参考量：热量 = 体重 × ${KCAL_PER_KG} 千卡，蛋白质 = 体重 × ${PROTEIN_PER_KG} 克。斤请除以 2）`,
      mine.weight || ''
    );
    if (input == null) return;
    const weight = parseFloat(input);
    if (!(weight >= 20 && weight <= 250)) {
      showToast('请填 20～250 之间的公斤数', 2500);
      return;
    }
    Store.set('members', Store.get('members').map((m) => (m.id === Store.deviceId ? Object.assign({}, m, { weight }) : m)));
    const goal = personGoal({ weight });
    showToast(`已记下 ${formatQty(weight)} 公斤\n每天参考：${goal.kcal} 千卡、蛋白质 ${goal.protein} 克`, 3000);
  });

  // 改自己的称呼（比如选错了）
  $('member-list').addEventListener('click', (e) => {
    if (!e.target.closest('.rename-button')) return;
    const mine = me();
    if (!mine) return;
    const name = (prompt('把你的称呼改成：', mine.name) || '').trim().slice(0, 8);
    if (!name || name === mine.name) return;
    Store.set(
      'members',
      Store.get('members').map((m) =>
        m.id === Store.deviceId ? Object.assign({}, m, { name, avatar: OWNER_AVATARS[name] || '👤' }) : m
      )
    );
    showToast(`已改成「${name}」`);
  });

  // 邀请新成员：弹出邀请窗，可以复制邀请文字（最稳，微信里直接粘贴）或用手机分享
  function inviteText() {
    return `📢 滴！这是我们家的专属冰箱，点链接加入，一起管剩菜啦！\n${Store.inviteUrl()}`;
  }

  $('invite-button').addEventListener('click', () => {
    if (!Store.isCloud) {
      showToast('还没接入云端，现在邀请家人也看不到同一个冰箱', 2500);
      return;
    }
    $('invite-link').textContent = Store.inviteUrl();
    // 手机不支持系统分享时，隐藏"更多分享方式"
    $('invite-share').hidden = !navigator.share;
    $('invite-modal').hidden = false;
  });

  $('invite-copy').addEventListener('click', async () => {
    const text = inviteText();
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // 老浏览器不支持剪贴板接口时，用传统方式复制
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    showToast('已复制！打开微信，在聊天框里长按粘贴发给家人', 3000);
  });

  // 只分享链接本身：微信的分享入口同时收到文字和链接时会报错
  $('invite-share').addEventListener('click', async () => {
    try {
      await navigator.share({ title: familyName(), url: Store.inviteUrl() });
    } catch (err) {
      // 用户取消分享时不用提示
    }
  });

  $('invite-close').addEventListener('click', () => {
    $('invite-modal').hidden = true;
  });

  // ---------- 📊 营养大盘 ----------

  function renderNutrition() {
    const today = todayString();
    const members = Store.get('members');
    const todayRecords = Store.get('eatenLog').filter((r) => r.date === today);

    // 每个人一行：先列家庭成员（按体重算各自的参考量），再列旧记录里的其他名字
    const rows = {};
    members.forEach((m) => {
      rows[m.id] = { name: m.name, avatar: m.avatar || OWNER_AVATARS[m.name] || '👤', goal: personGoal(m), weight: m.weight, kcal: 0, protein: 0 };
    });
    let totalKcal = 0;
    let totalProtein = 0;
    todayRecords.forEach((r) => {
      totalKcal += r.kcal;
      totalProtein += r.protein;
      let key = r.eaterId && rows[r.eaterId] ? r.eaterId : null;
      if (!key) {
        const byName = members.find((m) => m.name === r.owner);
        key = byName ? byName.id : `name:${r.owner}`;
      }
      if (!rows[key]) rows[key] = { name: r.owner, avatar: OWNER_AVATARS[r.owner] || '👤', goal: null, kcal: 0, protein: 0 };
      rows[key].kcal += r.kcal;
      rows[key].protein += r.protein;
    });
    totalProtein = Math.round(totalProtein * 10) / 10;

    const kcalGoal = members.length ? members.reduce((sum, m) => sum + personGoal(m).kcal, 0) : KCAL_PER_PERSON;
    const proteinGoal = members.length ? members.reduce((sum, m) => sum + personGoal(m).protein, 0) : PROTEIN_PER_PERSON;

    // 进度条最多显示到 100%
    const kcalPercent = Math.min(100, Math.round((totalKcal / kcalGoal) * 100));
    const proteinPercent = Math.min(100, Math.round((totalProtein / proteinGoal) * 100));

    $('today-text').textContent = `${today} · 今天全家吃的食物`;
    $('total-kcal').textContent = totalKcal;
    $('total-protein').textContent = totalProtein;
    $('kcal-fill').style.width = kcalPercent + '%';
    $('protein-fill').style.width = proteinPercent + '%';
    $('kcal-goal').textContent = `全家参考量 ${kcalGoal} 千卡 · 已达 ${kcalPercent}%`;
    $('protein-goal').textContent = `全家参考量 ${proteinGoal} 克 · 已达 ${proteinPercent}%`;

    const list = Object.keys(rows)
      .map((k) => rows[k])
      .filter((r) => r.goal || r.kcal || r.protein);
    $('member-stats-card').hidden = list.length === 0;
    $('member-stats').innerHTML = list
      .map(
        (m) => `
          <div class="member-stat">
            <div class="row">
              <span class="row-name">${escapeHtml(m.avatar)} ${escapeHtml(m.name)}${m.weight ? ` <span class="food-qty">${formatQty(m.weight)}公斤</span>` : ''}</span>
              <span class="row-numbers">${m.kcal} 千卡 · ${Math.round(m.protein * 10) / 10} 克</span>
            </div>
            ${
              m.goal
                ? `<div class="goal-line">参考量 ${m.goal.kcal} 千卡 · ${m.goal.protein} 克${m.goal.byWeight ? '（按体重算）' : '（没填体重，按平均值）'}</div>`
                : ''
            }
          </div>`
      )
      .join('');

    if (todayRecords.length === 0) {
      $('eaten-list').innerHTML =
        '<p class="empty-text">今天还没有记录。去"共享大冰箱"点绿色的"吃"，这里就会自动累加。</p>';
      return;
    }
    // 最新吃的排在最上面
    $('eaten-list').innerHTML = todayRecords
      .slice()
      .reverse()
      .map(
        (r) => `
          <div class="row">
            <span class="row-name">${escapeHtml(r.name)}${r.qty != null ? ` <span class="food-qty">${formatQty(r.qty)}${escapeHtml(r.unit)}</span>` : ''}</span>
            ${
              r.known
                ? `<span class="row-numbers">${r.kcal} 千卡 · ${r.protein} 克</span>`
                : '<span class="row-unknown">营养未收录</span>'
            }
          </div>`
      )
      .join('');
  }

  // ---------- 👋 第一次进入家庭时选称呼 ----------

  $('who-options').innerHTML = WHO_CHOICES.map(
    (name) => `<button class="who-option" data-name="${name}">${OWNER_AVATARS[name] || '👤'} ${name}</button>`
  ).join('');

  function joinFamily(name) {
    name = name.trim();
    if (!name) {
      showToast('请选一个称呼');
      return;
    }
    const members = Store.get('members');
    Store.set(
      'members',
      members.concat({
        id: Store.deviceId,
        avatar: OWNER_AVATARS[name] || '👤',
        name,
        // 第一个进来的人是管理员
        role: members.length === 0 ? '管理员' : '家庭成员',
      })
    );
    $('who-modal').hidden = true;
    showToast(`欢迎你，${name}！`);
  }

  $('who-options').addEventListener('click', (e) => {
    const button = e.target.closest('.who-option');
    if (button) joinFamily(button.dataset.name);
  });
  $('who-form').addEventListener('submit', (e) => {
    e.preventDefault();
    joinFamily($('who-input').value);
  });

  // ---------- 🔄 加入 / 切换家庭 ----------

  // 先确认编号对应的家庭真的存在，再切换过去，防止输错编号进到一个空冰箱
  async function joinFamilyById(rawId) {
    const id = Store.normalizeId(rawId);
    if (id.length < 10) {
      showToast('家庭编号是 10 位字母和数字，请再核对一下', 2500);
      return;
    }
    if (id === Store.familyId) {
      showToast('你已经在这个家庭里了');
      return;
    }
    showToast('正在查找这个家庭…', 5000);
    try {
      if (!(await Store.familyExists(id))) {
        showToast('没找到这个家庭，请核对编号（看家人「我的家庭」黄色卡片）', 3500);
        return;
      }
    } catch (err) {
      showToast('网络连接失败，请稍后再试', 2500);
      return;
    }
    Store.switchFamily(id);
  }

  $('join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    joinFamilyById($('join-input').value);
  });

  $('create-family').addEventListener('click', () => {
    const name = $('new-family-name').value.trim() || DEFAULT_FAMILY_NAME;
    if (confirm(`确定要创建「${name}」吗？\n如果家人已经在用了，请改为输入他们的家庭编号加入。`)) {
      // 先记下名字，切换到新家庭后再保存到云端
      try {
        localStorage.setItem('fridge.pendingFamilyName', name);
      } catch (e) {}
      Store.switchFamily(Store.newFamilyId());
    }
  });

  $('rename-family').addEventListener('click', () => {
    const name = (prompt('给你们家的冰箱起个名字：', familyName()) || '').trim().slice(0, 12);
    if (!name || name === familyName()) return;
    Store.set('settings', Object.assign({}, Store.get('settings'), { familyName: name }));
    updateManifest();
    showToast(`已改名为「${name}」`);
  });

  // 使用说明
  $('help-button').addEventListener('click', () => {
    $('help-modal').hidden = false;
  });
  $('help-close').addEventListener('click', () => {
    $('help-modal').hidden = true;
  });

  $('switch-family').addEventListener('click', () => {
    const id = prompt('输入要切换到的家庭编号（在家人「我的家庭」黄色卡片上）：');
    if (id) joinFamilyById(id);
  });

  // 选称呼时，如果家庭里已经有成员，先让用户看看是不是"认回自己"
  function showWhoModal() {
    const members = Store.get('members');
    $('claim-section').hidden = members.length === 0;
    $('claim-options').innerHTML = members
      .map(
        (m) =>
          `<button class="who-option" data-member="${escapeHtml(m.id)}">${escapeHtml(m.avatar)} 我是${escapeHtml(m.name)}</button>`
      )
      .join('');
    $('who-modal').hidden = false;
  }

  $('claim-options').addEventListener('click', (e) => {
    const button = e.target.closest('.who-option');
    if (button) Store.claimMember(button.dataset.member);
  });

  // 让"添加到主屏幕"的图标也带着家庭编号打开（安卓 Chrome 会读这个设置）
  function updateManifest() {
    const base = new URL('./', location.href).toString();
    const manifest = {
      name: familyName(),
      short_name: familyName().slice(0, 6),
      start_url: Store.inviteUrl(),
      scope: base,
      display: 'standalone',
      background_color: '#f7f7f7',
      theme_color: '#4CAF50',
      icons: [
        { src: base + 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: base + 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    document.querySelector('link[rel=manifest]').href = URL.createObjectURL(blob);
  }

  // ---------- 🔄 自动更新到新版本 ----------
  // 手机（尤其是添加到主屏幕的图标）会把网页存起来，发布新版后可能还在用旧的
  // 所以每次打开或切回来时，去网上问一下最新版本号；不一样就带着新版本号重新打开一次
  async function checkForUpdate() {
    try {
      const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const latest = (await res.json()).version;
      const current = String(window.APP_VERSION || '').replace('?v=', '');
      const url = new URL(location.href);
      // 已经带着这个版本号打开过了就不再跳，防止网站还没完全更新好时反复刷新
      if (latest && current && latest !== current && url.searchParams.get('v') !== latest) {
        url.searchParams.set('v', latest); // 网址变了，手机就不会再用存着的旧网页
        location.replace(url.toString());
      }
    } catch (err) {
      // 没网的时候就先用现在的版本
    }
  }
  checkForUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });

  // ---------- 启动 ----------
  function renderAll() {
    renderFamilyName();
    renderFridge();
    renderMenu();
    renderFamily();
    renderNutrition();
  }

  // 任何数据变化都重新画一遍，三个页面始终同步
  Store.watch(renderAll);
  renderAll();

  // 云端模式：先确认这台设备在哪个家庭，再看"我"是不是已经在家庭成员里
  if (Store.isCloud) {
    $('sync-status').textContent = '☁️ 正在连接云端…';
    Store.ready.then((ok) => {
      if (ok === 'needs-family') {
        $('family-modal').hidden = false;
        return;
      }
      // 刚创建的家庭：把创建时起的名字存上
      let pendingName = null;
      try {
        pendingName = localStorage.getItem('fridge.pendingFamilyName');
        localStorage.removeItem('fridge.pendingFamilyName');
      } catch (e) {}
      if (ok && pendingName && !(Store.get('settings') || {}).familyName) {
        Store.set('settings', Object.assign({}, Store.get('settings'), { familyName: pendingName }));
      }
      updateManifest();
      $('sync-status').textContent = ok ? '☁️ 已和家人实时同步' : '⚠️ 云端连接失败，暂时只保存在本机';
      if (ok && !me()) showWhoModal();
    });
  } else {
    $('switch-family').hidden = true;
    $('rename-family').hidden = true;
  }
})();
