// 张家大冰箱网页版：页面逻辑
// 冰箱（吃多少记多少、冷藏/冷冻）、一周食谱、家庭（购买清单、买到入库）、营养大盘
(function () {
  const { parseItem, nutritionFor, shelfDays, canFreeze, isSeasoning, toGrams, lookup, formatQty, todayString } = window.Foods;
  // 数量 + 单位，按当前语言显示（英文界面里 2盒 → 2 boxes，1斤 → 500 g 或 1.1 lb）
  const amt = (qty, unit) => Foods.amountText(qty, unit, I18N.lang, region());
  // 购买清单上的文字：能拆出数量的，单位按语言显示
  function itemText(text) {
    const p = parseItem(text);
    return /\d/.test(text) ? `${foodLabel(p.name)} ${amt(p.qty, p.unit)}` : foodLabel(text);
  }
  // 菜名：内置的菜按语言显示英文名
  // 菜名、食材名按语言显示：内置菜谱有英文名；其他常见中文食材名查对照表，查不到的原样显示
  function dishLabel(name) {
    if (I18N.lang !== 'en') return name;
    const label = Recipes.label(name, 'en');
    return label !== name ? label : FoodNames.englishName(name);
  }
  function foodLabel(name) {
    if (I18N.lang !== 'en') return name;
    const label = Recipes.ingredient(name, 'en');
    return label !== name ? label : FoodNames.englishName(name);
  }
  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => I18N.t(key, vars);
  const SEP = () => t('sep');

  // 存在数据里的是中文（冷藏、食谱需要、老婆买入…），显示时按当前语言翻译
  function showRole(role) {
    return t('role_' + role) === 'role_' + role ? role : t('role_' + role);
  }
  function showRequester(text) {
    if (text === '食谱需要') return t('fromMenu');
    const m = /^(.+)需要$/.exec(text || '');
    return m ? t('wants', { name: m[1] }) : text;
  }
  function showAddedBy(text) {
    if (text === '示例') return t('sample');
    const m = /^(.+)(买入|放入)$/.exec(text || '');
    return m ? t('boughtBy', { name: m[1] }) : text;
  }
  function mealName(meal) {
    return t('meal_' + meal);
  }
  function weekdayName(d) {
    return t('weekdays').split(',')[d];
  }

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
    Husband: '👨', Wife: '👩', Dad: '👨', Mom: '👩', Grandpa: '👴', Grandma: '👵',
    Brother: '👦', Sister: '👧', Son: '👦', Daughter: '👧', Baby: '👶',
  };

  // 家庭名：每家自己起，比如"李家大冰箱"；还没起名时显示"家庭大冰箱"
  const DEFAULT_FAMILY_NAME = '家庭大冰箱'; // 没起名时显示 t('defaultFamilyName')
  // 家庭名：中文界面用 familyName；英文界面优先用英文名 familyNameEn，没起英文名就用中文名
  function familyName() {
    const settings = Store.get('settings') || {};
    if (I18N.lang === 'en' && settings.familyNameEn) return settings.familyNameEn;
    return settings.familyName || t('defaultFamilyName');
  }

  function renderFamilyName() {
    const name = familyName();
    document.querySelectorAll('.family-name').forEach((el) => {
      el.textContent = name;
    });
    document.title = name;
    $('welcome-text').textContent = t('welcome', { name });
  }

  // 这台设备上的"我"是成员列表里的哪一位（还没选称呼时是 null）
  function me() {
    return Store.get('members').find((m) => m.id === Store.deviceId) || null;
  }
  function myName() {
    const m = me();
    return m ? m.name : t('me');
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
    // 点一下提示就关掉
    toast.onclick = () => {
      toast.hidden = true;
    };
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    // 至少显示 3 秒，字多的再按字数加长一点，给人反应的时间
    const time = Math.max(duration || 0, 3000, String(text).length * 150);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, time);
  }

  // 带一个按钮的提示（比如"撤销"），显示 6 秒
  function showToastWithAction(text, label, action) {
    const toast = $('toast');
    toast.innerHTML = '';
    toast.appendChild(document.createTextNode(text + '  '));
    const button = document.createElement('button');
    button.className = 'toast-action';
    button.textContent = label;
    button.onclick = (e) => {
      e.stopPropagation();
      toast.hidden = true;
      action();
    };
    toast.appendChild(button);
    toast.hidden = false;
    toast.onclick = () => {
      toast.hidden = true;
    };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 6000);
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
        if (added.length) showToast(t('menuMissing', { items: added.map(itemText).join(SEP()) }), 3500);
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
    const text = days < 0 ? t('expiredDays', { n: -days }) : (days === 0 ? t('expiresToday') : days === 1 ? t('dayLeft') : t('daysLeft', { n: days }));
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
      <button class="small-button" data-action="qty" data-id="${escapeHtml(food.id)}">${t('editQty')}</button>
      <button class="small-button gray" data-action="delete" data-id="${escapeHtml(food.id)}">${t('deleteBtn')}</button>`;

    $('food-list').innerHTML = foods.length
      ? foods
          .map((food) => {
            const remain = remainingInfo(food.expireDate);
            const frozen = food.storage === '冷冻';
            const partial = food.qty < food.initialQty;
            const freezeButton =
              frozen || canFreeze(food.name)
                ? `<button class="small-button" data-action="storage" data-id="${escapeHtml(food.id)}">${frozen ? t('unfreeze') : t('freezeIt')}</button>`
                : '';
            return `
          <div class="food-card ${frozen ? 'frozen-card' : ''} ${partial ? 'partial-card' : ''}">
            <div class="food-info">
              <div class="food-name">${escapeHtml(foodLabel(food.name))} <span class="food-qty">${partial ? t('left') : ''}${escapeHtml(amt(food.qty, food.unit))}${partial ? t('leftSuffix') : ''}</span>${partial ? ` <span class="partial-tag">${t('partlyEaten')}</span>` : ''}</div>
              <div class="food-details">
                <span class="storage-tag ${frozen ? 'frozen' : ''}">${frozen ? t('frozen') : t('chilled')}</span>
                <label class="remaining-days ${remain.cls}" title="${t('editDateTitle')}">
                  ${remain.text} ✏️
                  <input type="date" class="date-input" data-id="${escapeHtml(food.id)}" value="${escapeHtml(food.expireDate)}" />
                </label>
                <span class="added-by">[👤 ${escapeHtml(showAddedBy(food.addedBy))}]</span>
              </div>
              <div class="card-actions">${freezeButton}${editButtons(food)}</div>
            </div>
            <button class="finish-button" data-action="eat" data-id="${escapeHtml(food.id)}">${t('eat')}</button>
          </div>`;
          })
          .join('')
      : `<p class="empty-text">${t('fridgeEmpty')}</p>`;

    $('seasoning-card').hidden = seasonings.length === 0;
    $('seasoning-list').innerHTML = seasonings
      .map(
        (food) => `
          <div class="seasoning-row">
            <span class="seasoning-name">${escapeHtml(foodLabel(food.name))} <span class="food-qty">${escapeHtml(amt(food.qty, food.unit))}</span></span>
            <button class="small-button" data-action="qty" data-id="${escapeHtml(food.id)}">✏️</button>
            <button class="small-button gray" data-action="usedup" data-id="${escapeHtml(food.id)}">${t('usedUp')}</button>
          </div>`
      )
      .join('');
  }

  // 改数量和单位：比如西瓜改成"1个"、水改成"1箱"或"6瓶"
  function editQuantity(id) {
    const food = getFoods().find((f) => f.id === id);
    if (!food) return;
    const examples = region() === 'US' ? t('qtyExamplesUS') : t('qtyExamplesCN');
    const input = prompt(t('qtyPrompt', { name: food.name, examples }), `${formatQty(food.qty)}${food.unit}`);
    if (input == null) return;
    const text = input.trim();
    if (!text) return;
    // 只写数字时保留原来的单位
    const parsed = /^\d+(\.\d+)?$/.test(text) ? { qty: parseFloat(text), unit: food.unit } : parseItem(`${food.name} ${text}`);
    if (!(parsed.qty > 0) || parsed.name === `${food.name} ${text}`.trim()) {
      showToast(t('qtyNotUnderstood'), 2500);
      return;
    }
    saveFoods(
      getFoods().map((f) =>
        f.id === id ? Object.assign({}, f, { qty: parsed.qty, unit: parsed.unit, initialQty: parsed.qty }) : f
      )
    );
    showToast(t('qtyChanged', { qty: amt(parsed.qty, parsed.unit) }));
  }

  // 删除：买错了、扔掉了、调料用完了（不计入营养）
  function removeFood(id, ask) {
    const food = getFoods().find((f) => f.id === id);
    if (!food) return;
    if (ask && !confirm(t('confirmDeleteFood', { name: food.name }))) return;
    saveFoods(getFoods().filter((f) => f.id !== id));
    showToast(t('deleted', { name: food.name }));
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
    showToast(t(food.storage === '冷冻' ? 'movedToFreezer' : 'movedToFridge', { name: food.name }), 2000);
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
    showToast(t('dateChanged'));
  });

  // ---------- 🍽️ 吃了多少 ----------
  let eatingId = null;

  function openEatModal(id) {
    const food = getFoods().find((f) => f.id === id);
    if (!food) return;
    eatingId = id;
    $('eat-title').textContent = `🍽️ ${foodLabel(food.name)}`;
    $('eat-left').textContent = t('eatLeft', { qty: amt(food.qty, food.unit) });
    $('eat-unit').textContent = amt(1, food.unit).replace(/^1\s*/, '');
    $('eat-amount').value = '';
    // 快捷按钮：全部、一半，数量大于 1 时再给一个"1 个单位"
    const quick = [
      { label: t('eatAll'), qty: food.qty },
      { label: t('eatHalf'), qty: food.qty / 2 },
    ];
    if (food.qty > 1) quick.push({ label: t('eatOne', { unit: amt(1, food.unit).replace(/^1\s*/, '') || 'pc' }), qty: 1 });
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
      showToast(t('fillAmount'));
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

    const amountText = amt(eaten, food.unit);
    const leftText = left > 0 ? t('eatLeftAfter', { qty: amt(left, food.unit) }) : t('eatAllGone');
    showToast(
      record.known
        ? t('eatToast', { amount: amountText, kcal: record.kcal, protein: record.protein, left: leftText })
        : t('eatToastUnknown', { amount: amountText, left: leftText }),
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

  // 自己写菜时，食材一栏只写了数量（如菜名"鸡蛋"、食材"4个"），就当成这道菜本身：鸡蛋 4个
  function isQuantityOnly(name) {
    return /^[\d.\s]*$/.test(name) || /^\d+(\.\d+)?\s*\S{1,3}$/.test(name) && parseItem(`x ${name}`).name === 'x';
  }
  function fixDishItems(dish) {
    if (!dish.items || dish.items.length === 0) return dish;
    let changed = false;
    const items = dish.items.map((item) => {
      if (!isQuantityOnly(String(item.name))) return item;
      changed = true;
      const text = String(item.name).trim();
      // 只写了数字：表里认识、并且按个数算的（如鸡蛋"个"）用它的单位，其他用"份"
      const food = lookup(dish.name);
      const unit = food.known && !/斤|克|两/.test(food.unit) ? food.unit : '份';
      const p = /^[\d.]+$/.test(text) ? { qty: parseFloat(text) || item.qty, unit } : parseItem(`x ${text}`);
      return { name: dish.name, qty: p.qty || 1, unit: p.unit || item.unit };
    });
    return changed ? Object.assign({}, dish, { items }) : dish;
  }
  // 纠正食谱里已有的这类菜（返回 true 表示有改动并已保存）
  function fixPlan() {
    const plan = getPlan();
    let changed = false;
    const fixed = {};
    Object.keys(plan).forEach((date) => {
      fixed[date] = {};
      Object.keys(plan[date] || {}).forEach((meal) => {
        fixed[date][meal] = (plan[date][meal] || []).map((dish) => {
          const f = fixDishItems(dish);
          if (f !== dish) changed = true;
          return f;
        });
      });
    });
    if (changed) Store.set('mealPlan', fixed);
    return changed;
  }

  function renderMenu() {
    const plan = getPlan();
    const dates = weekDates(weekOffset);
    const today = todayString();
    $('week-range').textContent = t('weekRange', { from: dates[0].slice(5), to: dates[6].slice(5) });
    $('menu-days').innerHTML = dates
      .map((date) => {
        const d = new Date(date + 'T00:00:00');
        const day = plan[date] || {};
        const rows = MEALS.map((meal) => {
          const chips = (day[meal] || [])
            .map(
              (dish, i) =>
                `<span class="dish-chip">${escapeHtml(dishLabel(dish.name))}<button class="chip-x" data-action="remove" data-date="${date}" data-meal="${meal}" data-index="${i}" aria-label="${t('delete')}">✕</button></span>`
            )
            .join('');
          return `
            <div class="meal-row">
              <span class="meal-label">${mealName(meal)}</span>
              <div class="meal-dishes">
                ${chips}
                <button class="add-dish" data-action="add" data-date="${date}" data-meal="${meal}">${t('addDish')}</button>
              </div>
            </div>`;
        }).join('');
        return `
          <div class="card day-card ${date === today ? 'today' : ''} ${date < today ? 'past' : ''}">
            <div class="day-title">${weekdayName(d.getDay())} <span class="day-date">${date.slice(5)}</span>${date === today ? ` <span class="me-tag">${t('today')}</span>` : ''}</div>
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
          t('dishRemoved', { name: removedDish ? dishLabel(removedDish.name) : t('thisDish') }) +
            (removed.length ? t('dishRemovedFrom', { items: removed.map(itemText).join(SEP()) }) : '') +
            (added.length ? t('dishRemovedNeed', { items: added.map(itemText).join(SEP()) }) : ''),
          3500
        );
      }
    }
    if (button.dataset.action === 'add') openDishModal(date, meal);
  });

  function openDishModal(date, meal) {
    pickingSlot = { date, meal };
    const d = new Date(date + 'T00:00:00');
    $('dish-title').textContent = t('addDishTitle', { day: weekdayName(d.getDay()), meal: mealName(meal) });
    // 先列这一顿常吃的，再列其他的（早餐吃面条、晚餐吃饺子也行）
    const primary = Recipes.list(meal);
    const names = primary.map((r) => r.name);
    let recipes = primary.concat(Recipes.list().filter((r) => names.indexOf(r.name) === -1));
    // 英文界面把美式家常菜排在前面
    if (I18N.lang === 'en') recipes = recipes.filter((r) => r.us).concat(recipes.filter((r) => !r.us));
    $('dish-options').innerHTML = recipes
      .map((r) => `<button class="who-option" data-recipe="${escapeHtml(r.name)}">${escapeHtml(dishLabel(r.name))}</button>`)
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
        ? t('dishAdded', { name: dishLabel(dish.name), items: added.map(itemText).join(SEP()) })
        : t('dishAddedAllHave', { name: dishLabel(dish.name) }),
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
      showToast(t('writeDishName'));
      return;
    }
    addDish(fixDishItems({ name, items: Recipes.parseIngredients($('custom-dish-items').value) }));
  });

  $('dish-cancel').addEventListener('click', () => {
    $('dish-modal').hidden = true;
  });

  // 同一种食材的"归类名"：猪肉、五花肉、肉末都算同一类，这样冰箱里有就能扣掉
  function foodKey(name) {
    const food = lookup(name);
    return food.known ? food.keywords[0] : name.trim();
  }

  const NEVER_BUY = ['米饭'];

  // 常用单位：中国（盒、斤）或美国（加仑、磅）
  function region() {
    // 家里设过就用设好的；没设过的，英文界面默认美国单位，中文界面默认中国单位
    const r = (Store.get('settings') || {}).region;
    if (r === 'US' || r === 'CN') return r;
    return I18N.lang === 'en' ? 'US' : 'CN';
  }

  const LIQUID_KEYS = ['牛奶', '豆浆', '果汁'];
  function regionUnit(name, unit) {
    if (region() !== 'US') return unit;
    if (LIQUID_KEYS.indexOf(foodKey(name)) !== -1) return '加仑';
    if (['斤', '两', '克', '公斤', '千克', 'g', 'kg'].indexOf(unit) !== -1) return '磅';
    return unit;
  }

  // 让购买清单跟着食谱走：今天以后排好的所有菜 → 需要的食材 → 扣掉冰箱里和清单上已有的 → 清单里只留缺的
  // - 食谱自动加的、还没勾选的条目会按"现在还缺多少"重新计算（删菜后不再需要的就去掉）
  // - 手动添加的、已经勾选"买到了"的条目都不动
  // - 一种食材如果别的菜还要用，就不会被去掉
  // 返回 { added, removed }：这次新加的和去掉的食材文字
  // 今天以后排好的菜一共需要哪些食材：归类名 → { name, unit, amount（能换算成克就按克，否则按单位个数）, byWeight }
  function computeNeed() {
    const plan = getPlan();
    const today = todayString();
    const need = {};

    Object.keys(plan)
      .filter((date) => date >= today)
      .forEach((date) => {
        MEALS.forEach((meal) => {
          ((plan[date] || {})[meal] || []).forEach((dish) => {
            (fixDishItems(dish).items || []).forEach(({ name, qty, unit }) => {
              const key = foodKey(name);
              // 米饭现做现吃，不自动加进购买清单
              if (NEVER_BUY.indexOf(key) !== -1) return;
              const grams = toGrams(name, qty, unit);
              if (!need[key]) need[key] = { name, unit, amount: 0, byWeight: grams > 0 };
              const n = need[key];
              n.amount += n.byWeight ? grams : unit === n.unit ? qty : 0;
            });
          });
        });
      });
    return need;
  }

  function syncShoppingWithMenu() {
    const before = Store.get('shoppingList');
    const isAuto = (i) => i.requester === '食谱需要' && !i.bought;
    const kept = before.filter((i) => !isAuto(i));
    const need = computeNeed();

    // 点过 ✕ 的食材：当时食谱需要多少就"不买"多少；以后新排的菜多用到的部分才会再加上
    const settings = Store.get('settings') || {};
    const dismissed = Object.assign({}, settings.dismissed || {});
    let settingsChanged = false;
    // 旧版"家里常备"转成这种方式，然后不再显示
    (settings.pantry || []).forEach((key) => {
      if (need[key]) dismissed[key] = need[key].amount;
      settingsChanged = true;
    });
    Object.keys(dismissed).forEach((key) => {
      if (!need[key]) {
        // 用到它的菜都没了：清掉记录，以后再排就重新正常加
        delete dismissed[key];
        settingsChanged = true;
      } else {
        need[key].amount -= dismissed[key];
      }
    });
    if (settingsChanged) {
      const next = Object.assign({}, settings, { dismissed });
      delete next.pantry;
      Store.set('settings', next);
    }

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
      // 按家里的常用单位换算（美国：牛奶用加仑、肉菜用磅），按个数的向上取整
      const unit = n.byWeight ? regionUnit(n.name, n.unit) : n.unit;
      let qty = n.byWeight ? shortage / toGrams(n.name, 1, unit) : shortage;
      if (unit === '加仑' || unit === '磅') qty = Math.ceil(qty * 2 - 0.0001) / 2; // 美国单位按半个取整
      else qty = WEIGHT_UNIT_SET[unit] ? Math.ceil(qty * 10 - 0.0001) / 10 : Math.ceil(qty - 0.0001);
      const text = `${n.name} ${formatQty(qty)}${unit}`;
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
    $('family-id').textContent = Store.isCloud ? `📌 ${Store.familyId}` : t('localMode');

    const members = Store.get('members');
    $('member-list').innerHTML = members.length
      ? members
          .map(
            (m) => `
          <div class="member-item">
            <span class="member-avatar">${escapeHtml(m.avatar)}</span>
            <span class="member-name">${escapeHtml(m.name)}</span>
            <span class="member-role">(${escapeHtml(showRole(m.role))})${m.weight ? ` ${formatQty(m.weight)}${t('kg')}` : ''}</span>
            ${Store.isCloud && m.id === Store.deviceId ? `<span class="me-tag">${t('me')}</span><span class="member-buttons"><button class="rename-button">${t('rename')}</button><button class="weight-button">${t('weightBtn')}</button></span>` : ''}
          </div>`
          )
          .join('')
      : `<p class="empty-text">${t('noMembers')}</p>`;

    const items = Store.get('shoppingList');
    if (items.length === 0) {
      $('shopping-list').innerHTML = `<p class="empty-text">${t('shoppingEmpty')}</p>`;
      return;
    }
    $('shopping-list').innerHTML = items
      .map(
        (item) => `
          <div class="shopping-row">
            <label class="shopping-item">
              <input type="checkbox" data-id="${escapeHtml(item.id)}" ${item.bought ? 'checked' : ''} />
              <span class="shopping-item-text ${item.bought ? 'bought-item' : ''}">
                ${escapeHtml(itemText(item.name))}  [${escapeHtml(showRequester(item.requester))}]
              </span>
            </label>
            <button class="record-x" data-delete-item="${escapeHtml(item.id)}" aria-label="${t('delete')}">✕</button>
          </div>`
      )
      .join('');
  }

  function renderRegion() {
    document.querySelectorAll('.region-button').forEach((b) => b.classList.toggle('active', b.dataset.region === region()));
    $('new-item-input').placeholder = region() === 'US' ? t('addItemPhUS') : t('addItemPhCN');
  }

  document.querySelectorAll('.region-button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.region === region()) return;
      Store.set('settings', Object.assign({}, Store.get('settings'), { region: button.dataset.region }));
      // 食谱自动加的条目按新单位重新算一遍
      syncShoppingWithMenu();
      showToast(button.dataset.region === 'US' ? t('unitsSetUS') : t('unitsSetCN'));
    });
  });

  // 删除购买清单里的一项：直接消失。食谱自动加的，记下"这次不买"，以后只有新排的菜多用到才会再加
  $('shopping-list').addEventListener('click', (e) => {
    const button = e.target.closest('[data-delete-item]');
    if (!button) return;
    e.preventDefault();
    const item = Store.get('shoppingList').find((i) => i.id === button.dataset.deleteItem);
    if (!item) return;
    if (item.requester === '食谱需要') {
      const key = foodKey(parseItem(item.name).name);
      const need = computeNeed()[key];
      if (need) {
        const settings = Store.get('settings') || {};
        const dismissed = Object.assign({}, settings.dismissed || {}, { [key]: need.amount });
        Store.set('settings', Object.assign({}, settings, { dismissed }));
      }
    }
    Store.set('shoppingList', Store.get('shoppingList').filter((i) => i.id !== item.id));
    showToast(t('deleted', { name: item.name }));
  });

  // 买到：勾选一下就直接放进冰箱，从购买清单消失；提示里可以撤销
  function moveToFridge(items) {
    const newFoods = items.map((item, i) => {
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
    const ids = items.map((i) => i.id);
    saveFoods(getFoods().concat(newFoods));
    Store.set('shoppingList', Store.get('shoppingList').filter((i) => ids.indexOf(i.id) === -1));
    return newFoods;
  }

  $('shopping-list').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox' || !e.target.checked) return;
    const item = Store.get('shoppingList').find((i) => i.id === e.target.dataset.id);
    if (!item) return;
    const [food] = moveToFridge([item]);
    showToastWithAction(t('inFridge', { name: shortName(item.name) }), t('undo'), () => {
      // 撤销：从冰箱拿出来，放回购买清单
      saveFoods(getFoods().filter((f) => f.id !== food.id));
      Store.set('shoppingList', Store.get('shoppingList').concat(Object.assign({}, item, { bought: false })));
      showToast(t('undone', { name: shortName(item.name) }));
    });
  });

  // 手动添加要买的食材
  $('add-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('new-item-input');
    const name = input.value.trim();
    if (!name) {
      showToast(t('enterItemName'));
      return;
    }
    // 只写了数量（比如"4个""1"）没写食材名
    const parsed = parseItem(name);
    if (/^[\d.\s]*$/.test(parsed.name) || parsed.name === name.replace(/\s/g, '') && /^\d/.test(name)) {
      showToast(t('needItemName'), 2500);
      return;
    }
    Store.set(
      'shoppingList',
      Store.get('shoppingList').concat({ id: `item-${Date.now()}`, name, requester: `${myName()}需要`, bought: false })
    );
    input.value = '';
    showToast(t('addedOk'));
  });

  // 填自己的体重：营养大盘按体重算每个人的参考热量和蛋白质
  $('member-list').addEventListener('click', (e) => {
    if (!e.target.closest('.weight-button')) return;
    const mine = me();
    if (!mine) return;
    const input = prompt(
      t('weightPrompt', { kcal: KCAL_PER_KG, protein: PROTEIN_PER_KG }),
      mine.weight ? `${formatQty(mine.weight)}${I18N.lang === 'en' ? ' kg' : '公斤'}` : ''
    );
    if (input == null) return;
    const text = input.trim().toLowerCase();
    const num = parseFloat(text);
    if (!(num > 0)) {
      showToast(t('weightNeedNumber'), 2500);
      return;
    }
    let weight;
    if (/斤/.test(text) && !/公斤/.test(text)) weight = num / 2;
    else if (/磅|lb/.test(text)) weight = Math.round(num * 0.4536 * 10) / 10;
    else if (/公斤|kg|千克/.test(text)) weight = num;
    else {
      // 只写了数字：大于 90 的多半是"斤"，问一下
      weight = num;
      // 英文界面问是不是磅，中文界面问是不是斤
      const perUnit = I18N.lang === 'en' ? 0.4536 : 0.5;
      if (num > 90 && confirm(t('weightJinConfirm', { num, kg: formatQty(Math.round(num * perUnit * 10) / 10) }))) {
        weight = Math.round(num * perUnit * 10) / 10;
      }
    }
    if (!(weight >= 20 && weight <= 250)) {
      showToast(t('weightOdd'), 2500);
      return;
    }
    Store.set('members', Store.get('members').map((m) => (m.id === Store.deviceId ? Object.assign({}, m, { weight }) : m)));
    const goal = personGoal({ weight });
    showToast(
      t('weightSaved', { w: formatQty(weight), kcal: goal.kcal, protein: goal.protein }),
      4000
    );
  });

  // 改自己的称呼（比如选错了）
  $('member-list').addEventListener('click', (e) => {
    if (!e.target.closest('.rename-button')) return;
    const mine = me();
    if (!mine) return;
    const name = (prompt(t('renamePrompt'), mine.name) || '').trim().slice(0, 12);
    if (!name || name === mine.name) return;
    Store.set(
      'members',
      Store.get('members').map((m) =>
        m.id === Store.deviceId ? Object.assign({}, m, { name, avatar: OWNER_AVATARS[name] || '👤' }) : m
      )
    );
    showToast(t('renamed', { name }));
  });

  // 邀请新成员：弹出邀请窗，可以复制邀请文字（最稳，微信里直接粘贴）或用手机分享
  function inviteText() {
    return t('inviteText', { url: Store.inviteUrl() });
  }

  $('invite-button').addEventListener('click', () => {
    if (!Store.isCloud) {
      showToast(t('inviteNoCloud'), 2500);
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
    showToast(t('inviteCopied'), 3000);
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

    $('today-text').textContent = t('todayText', { date: today });
    $('total-kcal').textContent = totalKcal;
    $('total-protein').textContent = totalProtein;
    $('kcal-fill').style.width = kcalPercent + '%';
    $('protein-fill').style.width = proteinPercent + '%';
    $('kcal-goal').textContent = t('familyGoalKcal', { goal: kcalGoal, pct: kcalPercent });
    $('protein-goal').textContent = t('familyGoalProtein', { goal: proteinGoal, pct: proteinPercent });

    const list = Object.keys(rows)
      .map((k) => rows[k])
      .filter((r) => r.goal || r.kcal || r.protein);
    $('member-stats-card').hidden = list.length === 0;
    $('member-stats').innerHTML = list
      .map(
        (m) => `
          <div class="member-stat">
            <div class="row">
              <span class="row-name">${escapeHtml(m.avatar)} ${escapeHtml(m.name)}${m.weight ? ` <span class="food-qty">${formatQty(m.weight)}${t('kg')}</span>` : ''}</span>
              <span class="row-numbers">${m.kcal} ${t('kcal')} · ${Math.round(m.protein * 10) / 10} ${t('gram')}</span>
            </div>
            ${
              m.goal
                ? `<div class="goal-line">${t('personGoal', { kcal: m.goal.kcal, protein: m.goal.protein })}${m.goal.byWeight ? t('byWeight') : t('byAverage')}</div>`
                : ''
            }
          </div>`
      )
      .join('');

    if (todayRecords.length === 0) {
      $('eaten-list').innerHTML =
        `<p class="empty-text">${t('nothingEaten')}</p>`;
      return;
    }
    // 最新吃的排在最上面
    $('eaten-list').innerHTML = todayRecords
      .slice()
      .reverse()
      .map(
        (r) => `
          <div class="row">
            <button class="record-x" data-record="${escapeHtml(r.id)}" aria-label="${t('delete')}">✕</button>
            <span class="row-name">${escapeHtml(foodLabel(r.name))}${r.qty != null ? ` <span class="food-qty">${escapeHtml(amt(r.qty, r.unit))}</span>` : ''}${r.owner ? ` <span class="eater">${escapeHtml(r.owner)}</span>` : ''}</span>
            ${
              r.known
                ? `<span class="row-numbers">${r.kcal} ${t('kcal')} · ${r.protein} ${t('gram')}</span>`
                : `<span class="row-unknown">${t('notListed')}</span>`
            }
          </div>`
      )
      .join('');
  }

  // 删除记错的"吃了"记录（不会放回冰箱）
  $('eaten-list').addEventListener('click', (e) => {
    const button = e.target.closest('.record-x');
    if (!button) return;
    const record = Store.get('eatenLog').find((r) => r.id === button.dataset.record);
    if (!record) return;
    if (!confirm(t('confirmDeleteRecord', { name: record.name, kcal: record.kcal }))) return;
    Store.set('eatenLog', Store.get('eatenLog').filter((r) => r.id !== record.id));
    showToast(t('recordDeleted'));
  });

  // ---------- 👋 第一次进入家庭时选称呼 ----------

  // 称呼选项跟着界面语言变（中文：老公、老婆…；英文：Husband、Wife…）
  function renderWhoOptions() {
    $('who-options').innerHTML = I18N.who()
      .map((name) => `<button class="who-option" data-name="${name}">${OWNER_AVATARS[name] || '👤'} ${name}</button>`)
      .join('');
  }
  renderWhoOptions();

  function joinFamily(name) {
    name = name.trim();
    if (!name) {
      showToast(t('pickName'));
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
    showToast(t('welcomeName', { name }));
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
      showToast(t('idTooShort'), 2500);
      return;
    }
    if (id === Store.familyId) {
      showToast(t('alreadyIn'));
      return;
    }
    showToast(t('searching'), 5000);
    try {
      if (!(await Store.familyExists(id))) {
        showToast(t('notFound'), 3500);
        return;
      }
    } catch (err) {
      showToast(t('networkError'), 2500);
      return;
    }
    Store.switchFamily(id);
  }

  $('join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    joinFamilyById($('join-input').value);
  });

  $('create-family').addEventListener('click', () => {
    const name = $('new-family-name').value.trim() || t('defaultFamilyName');
    if (confirm(t('confirmCreate', { name }))) {
      // 先记下名字，切换到新家庭后再保存到云端
      try {
        localStorage.setItem('fridge.pendingFamilyName', name);
      } catch (e) {}
      Store.switchFamily(Store.newFamilyId());
    }
  });

  $('rename-family').addEventListener('click', () => {
    // 英文界面改的是英文名，中文界面改的是中文名
    const key = I18N.lang === 'en' ? 'familyNameEn' : 'familyName';
    const current = (Store.get('settings') || {})[key] || '';
    const name = (prompt(t('renameFamilyPrompt'), current || familyName()) || '').trim().slice(0, 30);
    if (!name || name === current) return;
    Store.set('settings', Object.assign({}, Store.get('settings'), { [key]: name }));
    updateManifest();
    showToast(t('familyRenamed', { name }));
  });

  // 使用说明
  $('help-button').addEventListener('click', () => {
    $('help-modal').hidden = false;
  });
  $('help-close').addEventListener('click', () => {
    $('help-modal').hidden = true;
  });

  $('switch-family').addEventListener('click', () => {
    const id = prompt(t('switchPrompt'));
    if (id) joinFamilyById(id);
  });

  // 选称呼时，如果家庭里已经有成员，先让用户看看是不是"认回自己"
  function showWhoModal() {
    const members = Store.get('members');
    $('claim-section').hidden = members.length === 0;
    $('claim-options').innerHTML = members
      .map(
        (m) =>
          `<button class="who-option" data-member="${escapeHtml(m.id)}">${escapeHtml(m.avatar)} ${escapeHtml(t('claimAs', { name: m.name }))}</button>`
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

  // ---------- 🌐 中文 / English 切换 ----------
  let syncState = null;
  $('lang-button').addEventListener('click', () => {
    I18N.setLang(I18N.lang === 'zh' ? 'en' : 'zh');
    renderAll();
    renderWhoOptions();
    if (syncState) $('sync-status').textContent = t(syncState);
    if (!$('who-modal').hidden) showWhoModal();
  });

  // ---------- 启动 ----------
  function renderAll() {
    renderFamilyName();
    renderRegion();
    renderFridge();
    renderMenu();
    renderFamily();
    renderNutrition();
  }

  // 任何数据变化都重新画一遍，三个页面始终同步
  I18N.apply();
  Store.watch(renderAll);
  renderAll();

  // 云端模式：先确认这台设备在哪个家庭，再看"我"是不是已经在家庭成员里
  if (Store.isCloud) {
    $('sync-status').textContent = t('connecting');
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
        // 在英文界面创建的家庭，名字同时当作英文名
        const names = { familyName: pendingName };
        if (I18N.lang === 'en') names.familyNameEn = pendingName;
        Store.set('settings', Object.assign({}, Store.get('settings'), names));
      }
      updateManifest();
      syncState = ok ? 'synced' : 'syncFailed';
      $('sync-status').textContent = t(syncState);
      if (ok && !me()) showWhoModal();
      // 纠正以前"食材只写数量"的菜，并让购买清单跟着更新
      if (ok && fixPlan()) syncShoppingWithMenu();
      // 以前勾选了但还没点"买到"的，现在直接放进冰箱
      const ticked = ok ? Store.get('shoppingList').filter((i) => i.bought) : [];
      if (ticked.length) {
        moveToFridge(ticked);
        showToast(t('tickedMoved', { items: ticked.map((i) => shortName(i.name)).join(SEP()) }), 4000);
      }
    });
  } else {
    $('switch-family').hidden = true;
    $('rename-family').hidden = true;
  }
})();
