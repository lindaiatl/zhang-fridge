// 张家大冰箱网页版：页面逻辑
// 冰箱（吃多少记多少、冷藏/冷冻）、一周食谱、家庭（购买清单、买到入库）、营养大盘
(function () {
  const { parseItem, nutritionFor, shelfDays, canFreeze, toGrams, lookup, formatQty, todayString } = window.Foods;
  const $ = (id) => document.getElementById(id);

  // 每人每天的参考摄入量（成年人粗略估算），全家参考量 = 每人参考量 × 家庭成员人数
  const KCAL_PER_PERSON = 2000;
  const PROTEIN_PER_PERSON = 60;

  // 每个称呼对应的小头像
  const OWNER_AVATARS = {
    '宝贝': '👶', '爸爸': '👨', '妈妈': '👩', '老公': '👨', '老婆': '👩', '爷爷': '👴', '奶奶': '👵', '外公': '👴', '外婆': '👵',
    '哥哥': '🧑', '姐姐': '👩', '弟弟': '👦', '妹妹': '👧', '全家': '🏠',
  };
  const WHO_CHOICES = ['老公', '老婆', '爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆', '哥哥', '姐姐', '弟弟', '妹妹', '宝贝'];

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
        const added = addMissingToShopping();
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
    // 快过期的排在前面
    const foods = getFoods().sort((a, b) =>
      a.expireDate < b.expireDate ? -1 : a.expireDate > b.expireDate ? 1 : 0
    );

    if (foods.length === 0) {
      $('food-list').innerHTML = '<p class="empty-text">冰箱空空的。去"我的家庭"把买到的食材入库吧。</p>';
      return;
    }

    $('food-list').innerHTML = foods
      .map((food) => {
        const remain = remainingInfo(food.expireDate);
        const badge = OWNER_AVATARS[food.owner] && food.owner !== '全家' ? OWNER_AVATARS[food.owner] : '';
        const frozen = food.storage === '冷冻';
        const freezeButton = canFreeze(food.name)
          ? `<button class="small-button" data-action="storage" data-id="${escapeHtml(food.id)}">${frozen ? '🧊 改冷藏' : '❄️ 冻起来'}</button>`
          : '';
        return `
          <div class="food-card">
            ${badge ? `<span class="member-badge">${badge}</span>` : ''}
            <div class="food-info">
              <div class="food-name">${escapeHtml(food.name)} <span class="food-qty">${formatQty(food.qty)}${escapeHtml(food.unit)}</span></div>
              <div class="food-details">
                <span class="storage-tag ${frozen ? 'frozen' : ''}">${frozen ? '❄️ 冷冻' : '🧊 冷藏'}</span>
                <label class="remaining-days ${remain.cls}" title="点一下修改到期日">
                  ${remain.text} ✏️
                  <input type="date" class="date-input" data-id="${escapeHtml(food.id)}" value="${escapeHtml(food.expireDate)}" />
                </label>
                <span class="added-by">[👤 ${escapeHtml(food.addedBy)}]</span>
              </div>
              ${freezeButton}
            </div>
            <button class="finish-button" data-action="eat" data-id="${escapeHtml(food.id)}">吃了</button>
          </div>`;
      })
      .join('');
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

  $('food-list').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'eat') openEatModal(button.dataset.id);
    if (button.dataset.action === 'storage') toggleStorage(button.dataset.id);
  });

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
      owner: food.owner || '全家',
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
      setDishes(date, meal, (dishes) => dishes.filter((_, i) => i !== index));
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
    const added = date >= todayString() ? addMissingToShopping() : [];
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

  // 加菜后自动更新购买清单：今天以后排好的所有菜 → 需要的食材 → 扣掉冰箱里和清单里已有的 → 只加缺的
  // 返回这次新加进清单的食材文字
  function addMissingToShopping() {
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

    // 已经有的量：冰箱里的 + 购买清单里还没买的
    const haveItems = getFoods()
      .map((f) => ({ name: f.name, qty: f.qty, unit: f.unit }))
      .concat(Store.get('shoppingList').filter((i) => !i.bought).map((i) => parseItem(i.name)));
    function haveAmount(key, n) {
      return haveItems.reduce((total, item) => {
        if (foodKey(item.name) !== key) return total;
        if (n.byWeight) return total + toGrams(item.name, item.qty, item.unit);
        return item.unit === n.unit ? total + item.qty : total;
      }, 0);
    }

    const added = [];
    const newItems = [];
    Object.keys(need).forEach((key, i) => {
      const n = need[key];
      const shortage = n.amount - haveAmount(key, n);
      if (shortage <= 0.0001) return;
      // 换回原来的单位：按个数的向上取整，按重量的保留一位小数
      let qty = n.byWeight ? shortage / toGrams(n.name, 1, n.unit) : shortage;
      qty = WEIGHT_UNIT_SET[n.unit] ? Math.ceil(qty * 10 - 0.0001) / 10 : Math.ceil(qty - 0.0001);
      const text = `${n.name} ${formatQty(qty)}${n.unit}`;
      added.push(text);
      newItems.push({ id: `menu-${Date.now()}-${i}`, name: text, requester: '食谱需要', bought: false });
    });

    if (newItems.length) Store.set('shoppingList', Store.get('shoppingList').concat(newItems));
    return added;
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
            <span class="member-role">(${escapeHtml(m.role)})</span>
            ${Store.isCloud && m.id === Store.deviceId ? '<span class="me-tag">我</span><button class="rename-button">改称呼</button>' : ''}
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
      await navigator.share({ title: '张家大冰箱', url: Store.inviteUrl() });
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
    const familySize = Store.get('members').length || 1;
    const kcalGoal = KCAL_PER_PERSON * familySize;
    const proteinGoal = PROTEIN_PER_PERSON * familySize;
    const todayRecords = Store.get('eatenLog').filter((r) => r.date === today);

    let totalKcal = 0;
    let totalProtein = 0;
    const byOwner = {};
    todayRecords.forEach((r) => {
      totalKcal += r.kcal;
      totalProtein += r.protein;
      if (!byOwner[r.owner]) {
        byOwner[r.owner] = { owner: r.owner, avatar: OWNER_AVATARS[r.owner] || '👤', kcal: 0, protein: 0 };
      }
      byOwner[r.owner].kcal += r.kcal;
      byOwner[r.owner].protein += r.protein;
    });
    totalProtein = Math.round(totalProtein * 10) / 10;

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

    const stats = Object.keys(byOwner).map((key) => byOwner[key]);
    $('member-stats-card').hidden = stats.length === 0;
    $('member-stats').innerHTML = stats
      .map(
        (m) => `
          <div class="row">
            <span class="row-name">${m.avatar} ${escapeHtml(m.owner)}</span>
            <span class="row-numbers">${m.kcal} 千卡 · ${Math.round(m.protein * 10) / 10} 克蛋白质</span>
          </div>`
      )
      .join('');

    if (todayRecords.length === 0) {
      $('eaten-list').innerHTML =
        '<p class="empty-text">今天还没有记录。去"共享大冰箱"点"吃了"，这里就会自动累加。</p>';
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
    if (confirm('确定要创建一个新的家庭冰箱吗？\n如果家人已经在用了，请改为输入他们的家庭编号加入。')) {
      Store.switchFamily(Store.newFamilyId());
    }
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
      name: '张家大冰箱',
      short_name: '大冰箱',
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

  // ---------- 启动 ----------
  function renderAll() {
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
      updateManifest();
      $('sync-status').textContent = ok ? '☁️ 已和家人实时同步' : '⚠️ 云端连接失败，暂时只保存在本机';
      if (ok && !me()) showWhoModal();
    });
  } else {
    $('switch-family').hidden = true;
  }
})();
