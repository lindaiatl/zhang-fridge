// 中英双语：界面上所有固定文字都在这里，各有中文（zh）和英文（en）两套
// - 每个人自己选语言，存在这台手机上；第一次打开时按手机系统语言自动选
// - 家人自己写的内容（食材名、菜名、称呼）不翻译
(function () {
  const STRINGS = {
    // ---------- 通用 ----------
    sep: { zh: '、', en: ', ' },
    me: { zh: '我', en: 'Me' },
    cancel: { zh: '取消', en: 'Cancel' },
    ok: { zh: '确定', en: 'OK' },
    close: { zh: '关闭', en: 'Close' },
    delete: { zh: '删除', en: 'Delete' },
    undo: { zh: '撤销', en: 'Undo' },
    help: { zh: '❓ 说明', en: '❓ Help' },
    helpTitle: { zh: '❓ 使用说明', en: '❓ How to use' },
    gotIt: { zh: '知道了', en: 'Got it' },
    langSwitch: { zh: 'EN', en: '中文' },
    defaultFamilyName: { zh: '家庭大冰箱', en: 'Family Fridge' },
    kcal: { zh: '千卡', en: 'kcal' },
    gram: { zh: '克', en: 'g' },
    kg: { zh: '公斤', en: 'kg' },
    welcome: { zh: '欢迎来到{name}！这里是全家共享的食物管家。', en: 'Welcome to {name}! Your family’s shared food manager.' },

    // ---------- 底部标签 ----------
    tabFamily: { zh: '👥 我的家庭', en: '👥 Family' },
    tabMenu: { zh: '📅 本周食谱', en: '📅 Meals' },
    tabFridge: { zh: '🏠 共享大冰箱', en: '🏠 Fridge' },
    tabNutrition: { zh: '📊 营养大盘', en: '📊 Nutrition' },

    // ---------- 冰箱 ----------
    fridgeTitle: { zh: '冰箱里的食材', en: 'In the fridge' },
    fridgeHint: { zh: '快过期的排在最前面。点 ✏️ 可以改到期日。浅蓝底是冷冻，浅橙底是已吃一部分。', en: 'Items expiring soonest are on top. Tap ✏️ to change a date. Blue = frozen, orange = partly eaten.' },
    seasonings: { zh: '🧂 调料', en: '🧂 Seasonings' },
    fridgeDisclaimer: { zh: '⚠️ 保存天数是参考值（参考美国农业部 FoodKeeper），有包装保质期的以包装为准，拿不准时宁可丢掉。详见右上角「❓ 说明」里的免责声明。', en: '⚠️ Storage times are estimates (based on USDA FoodKeeper). Always go by the package date, and when in doubt, throw it out. See the disclaimer under “❓ Help”.' },
    fridgeEmpty: { zh: '冰箱空空的。去「我的家庭」的购买清单里勾选买到的食材，就会放进来。', en: 'The fridge is empty. Tick items on the shopping list (Family tab) and they’ll show up here.' },
    expiredDays: { zh: '⚠️ 已过期 {n} 天', en: '⚠️ Expired {n}d ago' },
    daysLeft: { zh: '⏱️ 剩 {n} 天', en: '⏱️ {n} days left' },
    dayLeft: { zh: '⏱️ 剩 1 天', en: '⏱️ 1 day left' },
    expiresToday: { zh: '⏱️ 今天到期', en: '⏱️ Expires today' },
    editDateTitle: { zh: '点一下修改到期日', en: 'Tap to change the date' },
    chilled: { zh: '🧊 冷藏', en: '🧊 Fridge' },
    frozen: { zh: '❄️ 冷冻', en: '❄️ Freezer' },
    freezeIt: { zh: '❄️ 冻起来', en: '❄️ Freeze' },
    unfreeze: { zh: '🧊 改冷藏', en: '🧊 Move to fridge' },
    editQty: { zh: '✏️ 改数量', en: '✏️ Amount' },
    deleteBtn: { zh: '🗑 删除', en: '🗑 Delete' },
    eat: { zh: '吃', en: 'Eat' },
    left: { zh: '还剩 ', en: '' },
    leftSuffix: { zh: '', en: ' left' },
    partlyEaten: { zh: '已吃一部分', en: 'partly eaten' },
    usedUp: { zh: '用完了', en: 'Used up' },
    qtyPrompt: { zh: '{name} 现在有多少？（例如：{examples}）', en: 'How much {name} is left? (e.g. {examples})' },
    qtyExamplesUS: { zh: '1个、1箱、1加仑、半加仑、1磅', en: '1 pc, 1 box, 1 gallon, 2 lb' },
    qtyExamplesCN: { zh: '1个、1箱、6瓶、0.5斤', en: '1 pc, 1 box, 6 bottles, 500 g' },
    qtyNotUnderstood: { zh: '没看懂，请写成"数字 + 单位"，如：1箱', en: 'Please write a number + unit, e.g. 1 box' },
    qtyChanged: { zh: '已改成 {qty}', en: 'Changed to {qty}' },
    confirmDeleteFood: { zh: '从冰箱里删除「{name}」吗？\n（不会计入营养，适合买错了或扔掉的）', en: 'Remove “{name}” from the fridge?\n(It won’t count as eaten — for things bought by mistake or thrown away.)' },
    deleted: { zh: '已删除：{name}', en: 'Deleted: {name}' },
    movedToFreezer: { zh: '{name}已放进冷冻室，到期日已更新', en: '{name} moved to the freezer; date updated' },
    movedToFridge: { zh: '{name}已改为冷藏，到期日已更新', en: '{name} moved to the fridge; date updated' },
    dateChanged: { zh: '到期日已修改', en: 'Date updated' },

    // ---------- 吃了多少 ----------
    eatLeft: { zh: '冰箱里还有 {qty}，这次吃了多少？', en: '{qty} left. How much did you eat?' },
    eatAll: { zh: '全部吃光', en: 'All of it' },
    eatHalf: { zh: '吃了一半', en: 'Half' },
    eatOne: { zh: '吃了 1{unit}', en: '1 {unit}' },
    orFillIn: { zh: '—— 或者自己填 ——', en: '— or enter an amount —' },
    howMuch: { zh: '吃了多少', en: 'Amount' },
    fillAmount: { zh: '请填写吃了多少', en: 'Please enter how much you ate' },
    eatLeftAfter: { zh: '，还剩 {qty}', en: ', {qty} left' },
    eatAllGone: { zh: '，已吃光', en: ', all gone' },
    eatToast: { zh: '吃了 {amount}：+{kcal} 千卡，蛋白质 {protein} 克{left}', en: 'Ate {amount}: +{kcal} kcal, {protein} g protein{left}' },
    eatToastUnknown: { zh: '吃了 {amount}（营养还没收录）{left}', en: 'Ate {amount} (nutrition not listed){left}' },

    // ---------- 食谱 ----------
    menuTitle: { zh: '📅 一周家庭食谱', en: '📅 Weekly meal plan' },
    thisWeek: { zh: '本周', en: 'This week' },
    nextWeek: { zh: '下周', en: 'Next week' },
    weekRange: { zh: '{from} ～ {to} · 每天排一日三餐', en: '{from} – {to} · breakfast, lunch & dinner' },
    menuNote: { zh: '加菜后，冰箱里没有的食材会自动放进「我的家庭」页的购买清单（已经有的不会重复加）。', en: 'When you add a dish, any ingredients not in the fridge go onto the shopping list (Family tab) automatically.' },
    meal_早餐: { zh: '早餐', en: 'Breakfast' },
    meal_午餐: { zh: '午餐', en: 'Lunch' },
    meal_晚餐: { zh: '晚餐', en: 'Dinner' },
    weekdays: { zh: '周日,周一,周二,周三,周四,周五,周六', en: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat' },
    today: { zh: '今天', en: 'Today' },
    addDish: { zh: '＋ 加菜', en: '＋ Add' },
    addDishTitle: { zh: '给{day}{meal}加菜', en: 'Add to {day} {meal}' },
    orWriteDish: { zh: '—— 或者自己写一道菜 ——', en: '— or write your own dish —' },
    dishNamePh: { zh: '菜名，如：葱爆羊肉', en: 'Dish name, e.g. Beef stew' },
    dishItemsPh: { zh: '食材，如：羊肉 1斤，葱 1把', en: 'Ingredients, e.g. beef 2 lb, carrots 3' },
    addThisDish: { zh: '加入这道菜', en: 'Add this dish' },
    writeDishName: { zh: '请写菜名', en: 'Please enter a dish name' },
    dishAdded: { zh: '已加入：{name}\n冰箱里没有的已放进购买清单：{items}', en: 'Added: {name}\nAdded to shopping list: {items}' },
    dishAddedAllHave: { zh: '已加入：{name}（食材冰箱里都有）', en: 'Added: {name} (everything’s in the fridge)' },
    dishRemoved: { zh: '已删除：{name}\n购买清单已更新', en: 'Removed: {name}\nShopping list updated' },
    dishRemovedFrom: { zh: '，去掉：{items}', en: ' — removed: {items}' },
    dishRemovedNeed: { zh: '，现在需要：{items}', en: ' — now needed: {items}' },
    thisDish: { zh: '这道菜', en: 'this dish' },
    menuMissing: { zh: '食谱里还缺的食材已放进购买清单：\n{items}', en: 'Missing ingredients added to the shopping list:\n{items}' },

    // ---------- 家庭 ----------
    familyConsole: { zh: '家庭控制台', en: 'Family' },
    familyIdLabel: { zh: '家庭唯一 Family ID：', en: 'Your Family ID:' },
    localMode: { zh: '📌 本机模式', en: '📌 This device only' },
    renameFamily: { zh: '✏️ 改家庭名', en: '✏️ Rename' },
    switchFamily: { zh: '🔄 切换到别的家庭', en: '🔄 Switch family' },
    members: { zh: '家庭成员', en: 'Family members' },
    noMembers: { zh: '还没有成员。', en: 'No members yet.' },
    role_管理员: { zh: '管理员', en: 'admin' },
    role_家庭成员: { zh: '家庭成员', en: 'member' },
    rename: { zh: '改称呼', en: 'Rename' },
    weightBtn: { zh: '⚖️ 体重', en: '⚖️ Weight' },
    units: { zh: '📏 常用单位', en: '📏 Units' },
    unitsCN: { zh: '中国（盒、斤）', en: 'Metric / China' },
    unitsUS: { zh: '美国（加仑、磅）', en: 'US (gallon, lb)' },
    unitsHint: { zh: '食谱自动加进购买清单时按这里的单位写。自己添加时什么单位都可以写。', en: 'Used when the meal plan adds items to the shopping list. You can type any unit yourself.' },
    unitsSetUS: { zh: '已改成美国常用单位：牛奶用加仑、肉菜用磅', en: 'Switched to US units: milk in gallons, meat & produce in pounds' },
    unitsSetCN: { zh: '已改成中国常用单位：盒、斤', en: 'Switched to metric / China units' },
    shoppingList: { zh: '🗒️ 购买清单', en: '🗒️ Shopping list' },
    addItemPhCN: { zh: '食材和数量，如：猪肉 1斤', en: 'Item and amount, e.g. pork 500 g' },
    addItemPhUS: { zh: '食材和数量，如：牛奶 1加仑、猪肉 1磅', en: 'Item and amount, e.g. milk 1 gallon' },
    addBtn: { zh: '➕ 添加', en: '➕ Add' },
    shoppingEmpty: { zh: '购买清单是空的。', en: 'The shopping list is empty.' },
    fromMenu: { zh: '食谱需要', en: 'for meals' },
    wants: { zh: '{name}需要', en: 'for {name}' },
    boughtBy: { zh: '{name}买入', en: 'bought by {name}' },
    sample: { zh: '示例', en: 'sample' },
    inFridge: { zh: '✅ {name}已放进冰箱', en: '✅ {name} is in the fridge' },
    undone: { zh: '已撤销，{name}放回了购买清单', en: 'Undone — {name} is back on the list' },
    enterItemName: { zh: '请输入食材名称', en: 'Please enter an item' },
    needItemName: { zh: '请写上食材名和数量，比如：苹果 4个', en: 'Please write the item and amount, e.g. apples 4' },
    addedOk: { zh: '添加成功！', en: 'Added!' },
    tickedMoved: { zh: '之前勾选过的已放进冰箱：{items}', en: 'Previously ticked items are now in the fridge: {items}' },
    invite: { zh: '✉️ 邀请新成员加入家庭', en: '✉️ Invite family members' },

    // ---------- 体重、称呼 ----------
    weightPrompt: { zh: '填你的体重，可以写"公斤"或"斤"，比如：55公斤 或 110斤\n（用来算每天参考量：热量 = 体重(公斤) × {kcal} 千卡，蛋白质 = 体重(公斤) × {protein} 克）', en: 'Your weight, in kg or lb, e.g. 55 kg or 120 lb\n(Daily reference: calories = weight in kg × {kcal}, protein = weight in kg × {protein} g)' },
    weightNeedNumber: { zh: '请写数字，比如：55公斤 或 110斤', en: 'Please enter a number, e.g. 55 kg or 120 lb' },
    weightJinConfirm: { zh: '你写的是 {num} 斤吗？\n点「确定」按 {num} 斤（{kg} 公斤）算；点「取消」按 {num} 公斤算。', en: 'Did you mean {num} lb?\nOK = {num} lb ({kg} kg); Cancel = {num} kg.' },
    weightOdd: { zh: '体重好像不对，请再核对一下', en: 'That weight looks off — please check it' },
    weightSaved: { zh: '已记下 {w} 公斤\n每天参考：{kcal} 千卡、蛋白质 {protein} 克', en: 'Saved: {w} kg\nDaily reference: {kcal} kcal, {protein} g protein' },
    renamePrompt: { zh: '把你的称呼改成：', en: 'Change your name to:' },
    renamed: { zh: '已改成「{name}」', en: 'Changed to “{name}”' },

    // ---------- 邀请 ----------
    inviteText: { zh: '📢 滴！这是我们家的专属冰箱，点链接加入，一起管剩菜啦！\n{url}', en: '📢 Join our family fridge app — tap the link:\n{url}' },
    inviteNoCloud: { zh: '还没接入云端，现在邀请家人也看不到同一个冰箱', en: 'Not connected to the cloud yet, so family members can’t share this fridge' },
    inviteTitle: { zh: '✉️ 邀请家人加入', en: '✉️ Invite your family' },
    inviteDesc: { zh: '把下面的邀请链接发给家人，他们点开就能进入同一个冰箱。也可以直接告诉他们上面的家庭编号。', en: 'Send this link to your family — opening it joins your fridge. Or just tell them your Family ID.' },
    inviteCopy: { zh: '📋 复制邀请（发微信用这个）', en: '📋 Copy invite' },
    inviteShare: { zh: '📤 用其他方式分享', en: '📤 Share…' },
    inviteCopied: { zh: '已复制！打开微信，在聊天框里长按粘贴发给家人', en: 'Copied! Paste it into a message to your family' },

    // ---------- 营养 ----------
    nutritionTitle: { zh: '📊 全家健康营养大盘', en: '📊 Family nutrition' },
    todayText: { zh: '{date} · 今天全家吃的食物', en: '{date} · what the family ate today' },
    totalKcal: { zh: '🔥 总热量', en: '🔥 Calories' },
    totalProtein: { zh: '💪 蛋白质', en: '💪 Protein' },
    familyGoalKcal: { zh: '全家参考量 {goal} 千卡 · 已达 {pct}%', en: 'Family reference {goal} kcal · {pct}%' },
    familyGoalProtein: { zh: '全家参考量 {goal} 克 · 已达 {pct}%', en: 'Family reference {goal} g · {pct}%' },
    perPerson: { zh: '👥 每个人', en: '👥 Each person' },
    todayEaten: { zh: '🍽️ 今天吃的食材', en: '🍽️ Eaten today' },
    personGoal: { zh: '参考量 {kcal} 千卡 · 蛋白质 {protein} 克', en: 'Reference {kcal} kcal · {protein} g protein' },
    byWeight: { zh: '（按体重算）', en: ' (by weight)' },
    byAverage: { zh: '（没填体重，按平均值）', en: ' (no weight entered — using the average)' },
    nothingEaten: { zh: '今天还没有记录。去「共享大冰箱」点绿色的「吃」，这里就会自动累加。', en: 'Nothing yet today. Tap the green “Eat” button in the Fridge tab and it adds up here.' },
    notListed: { zh: '营养未收录', en: 'not listed' },
    confirmDeleteRecord: { zh: '删除这条记录吗？\n{name}（{kcal} 千卡）\n只是从营养大盘里去掉，不会放回冰箱。', en: 'Delete this record?\n{name} ({kcal} kcal)\nIt’s only removed from the nutrition page, not put back in the fridge.' },
    recordDeleted: { zh: '已删除这条记录', en: 'Record deleted' },
    nutritionDisclaimer: { zh: '⚠️ 营养数值是按常见食材估算的参考值，不是精确数据，不构成医疗或营养建议。详见「❓ 说明」里的免责声明。', en: '⚠️ Nutrition figures are rough estimates, not medical or dietary advice. See the disclaimer under “❓ Help”.' },
    formulaTitle: { zh: '📐 参考量怎么算', en: '📐 How the reference is calculated' },

    // ---------- 加入家庭、选称呼 ----------
    welcomeTitle: { zh: '🧊 欢迎来到家庭大冰箱', en: '🧊 Welcome to Family Fridge' },
    joinDesc: { zh: '家里已经有人在用了？输入家人「我的家庭」页面上的 Family ID，就能进入同一个冰箱。', en: 'Is someone in your family already using it? Enter the Family ID from their Family tab to join the same fridge.' },
    joinPh: { zh: '输入家庭编号，10 位字母和数字', en: 'Family ID (10 letters/numbers)' },
    join: { zh: '加入', en: 'Join' },
    or: { zh: '—— 或者 ——', en: '— or —' },
    newFamilyPh: { zh: '给你们家的冰箱起个名字，如：李家大冰箱', en: 'Name your fridge, e.g. The Smiths’ Fridge' },
    createFamily: { zh: '🏠 我是第一个，创建我们家的冰箱', en: '🏠 I’m the first — create our fridge' },
    confirmCreate: { zh: '确定要创建「{name}」吗？\n如果家人已经在用了，请改为输入他们的家庭编号加入。', en: 'Create “{name}”?\nIf your family already uses the app, enter their Family ID instead.' },
    renameFamilyPrompt: { zh: '给你们家的冰箱起个名字：', en: 'Name your family fridge:' },
    familyRenamed: { zh: '已改名为「{name}」', en: 'Renamed to “{name}”' },
    switchPrompt: { zh: '输入要切换到的家庭编号（在家人「我的家庭」黄色卡片上）：', en: 'Enter the Family ID to switch to (on the yellow card in their Family tab):' },
    idTooShort: { zh: '家庭编号是 10 位字母和数字，请再核对一下', en: 'A Family ID has 10 letters/numbers — please check it' },
    alreadyIn: { zh: '你已经在这个家庭里了', en: 'You’re already in this family' },
    searching: { zh: '正在查找这个家庭…', en: 'Looking up this family…' },
    notFound: { zh: '没找到这个家庭，请核对编号（看家人「我的家庭」黄色卡片）', en: 'Family not found — check the ID on their Family tab' },
    networkError: { zh: '网络连接失败，请稍后再试', en: 'Network error — please try again' },
    joinWelcome: { zh: '👋 欢迎加入', en: '👋 Welcome to ' },
    claimDesc: { zh: '你以前在这个家庭里用过吗？点自己的名字认回来：', en: 'Used this fridge before? Tap your name:' },
    claimAs: { zh: '我是{name}', en: 'I’m {name}' },
    newMember: { zh: '—— 新成员请选称呼 ——', en: '— new here? pick a name —' },
    whoDesc: { zh: '你是家里的谁？选一个称呼，家人就能认出你。', en: 'Who are you in the family? Pick a name so everyone knows.' },
    whoPh: { zh: '或者自己写，比如：小姨', en: 'Or type your own, e.g. Aunt Amy' },
    pickName: { zh: '请选一个称呼', en: 'Please pick a name' },
    welcomeName: { zh: '欢迎你，{name}！', en: 'Welcome, {name}!' },

    // ---------- 同步状态 ----------
    connecting: { zh: '☁️ 正在连接云端…', en: '☁️ Connecting…' },
    synced: { zh: '☁️ 已和家人实时同步', en: '☁️ Synced with your family' },
    syncFailed: { zh: '⚠️ 云端连接失败，暂时只保存在本机', en: '⚠️ Can’t reach the cloud — saving on this device for now' },
  };

  // 称呼：中文界面和英文界面各一套（存进成员资料的是所选的那个字）
  const WHO = {
    zh: ['老公', '老婆', '爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆', '哥哥', '姐姐', '弟弟', '妹妹', '宝贝'],
    en: ['Husband', 'Wife', 'Dad', 'Mom', 'Grandpa', 'Grandma', 'Brother', 'Sister', 'Son', 'Daughter', 'Baby'],
  };

  function detect() {
    try {
      const saved = localStorage.getItem('fridge.lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'zh';
    return /^zh/i.test(nav) ? 'zh' : 'en';
  }

  let lang = detect();

  function t(key, vars) {
    const entry = STRINGS[key];
    let text = entry ? entry[lang] != null ? entry[lang] : entry.zh : key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        text = text.split(`{${k}}`).join(vars[k]);
      });
    }
    return text;
  }

  // 把页面上带 data-i18n 的固定文字换成当前语言
  function apply(root) {
    const scope = root || document;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.body.dataset.lang = lang;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
  }

  window.I18N = {
    get lang() {
      return lang;
    },
    t,
    apply,
    who: () => WHO[lang],
    setLang(next) {
      lang = next === 'en' ? 'en' : 'zh';
      try {
        localStorage.setItem('fridge.lang', lang);
      } catch (e) {}
      apply();
    },
  };
})();
