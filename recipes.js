// 内置家常菜菜谱库（不收费、不联网）
// 每道菜的食材按一家 2～3 口人一顿的量估算；油盐酱醋等调味品默认家里常备，不列入
// 食材名字尽量和 foods.js 里的关键词一致，这样营养、保存天数和"冰箱里有没有"都能对上
(function () {
  const RECIPES = [
    // ---------- 早餐 ----------
    { name: '白粥 + 水煮蛋', en: 'Rice porridge & boiled eggs', meal: '早餐', items: [['大米', 0.2, '斤'], ['鸡蛋', 3, '个']] },
    { name: '牛奶 + 面包', en: 'Milk & bread', meal: '早餐', items: [['牛奶', 3, '盒'], ['面包', 3, '个']] },
    { name: '鸡蛋饼', en: 'Egg pancake', meal: '早餐', items: [['鸡蛋', 4, '个'], ['面粉', 0.4, '斤'], ['葱', 1, '把']] },
    { name: '小米粥 + 包子', en: 'Millet porridge & steamed buns', meal: '早餐', items: [['小米', 0.2, '斤'], ['包子', 1, '袋']] },
    { name: '豆浆 + 油条', en: 'Soy milk & fried dough sticks', meal: '早餐', items: [['豆浆', 3, '盒'], ['油条', 3, '根']] },
    { name: '燕麦牛奶 + 香蕉', en: 'Oats with milk & banana', meal: '早餐', items: [['燕麦', 0.3, '斤'], ['牛奶', 3, '盒'], ['香蕉', 3, '根']] },
    { name: '火腿鸡蛋三明治', en: 'Ham & egg sandwich', meal: '早餐', items: [['吐司', 1, '袋'], ['鸡蛋', 3, '个'], ['火腿', 1, '包'], ['生菜', 1, '把']] },
    { name: '西红柿鸡蛋面', en: 'Tomato & egg noodles', meal: '早餐', items: [['面条', 3, '份'], ['西红柿', 2, '个'], ['鸡蛋', 3, '个']] },
    { name: '速冻饺子 / 馄饨', en: 'Frozen dumplings / wontons', meal: '早餐', items: [['饺子', 1, '袋']] },
    { name: '蒸红薯 + 酸奶', en: 'Steamed sweet potato & yogurt', meal: '早餐', items: [['红薯', 3, '个'], ['酸奶', 3, '盒']] },
    { name: '煎蛋 + 培根 + 吐司', en: 'Fried eggs, bacon & toast', meal: '早餐', items: [['鸡蛋', 3, '个'], ['培根', 1, '包'], ['吐司', 1, '袋']] },

    // ---------- 午餐、晚餐（正餐）----------
    { name: '番茄炒蛋', en: 'Tomato & egg stir-fry', meal: '正餐', items: [['西红柿', 3, '个'], ['鸡蛋', 4, '个']] },
    { name: '青椒肉丝', en: 'Pork with green peppers', meal: '正餐', items: [['瘦肉', 0.5, '斤'], ['青椒', 3, '个']] },
    { name: '红烧肉', en: 'Red-braised pork belly', meal: '正餐', items: [['五花肉', 1, '斤']] },
    { name: '宫保鸡丁', en: 'Kung pao chicken', meal: '正餐', items: [['鸡胸', 2, '块'], ['花生', 0.2, '斤'], ['黄瓜', 1, '根']] },
    { name: '麻婆豆腐', en: 'Mapo tofu', meal: '正餐', items: [['豆腐', 1, '块'], ['肉末', 0.2, '斤']] },
    { name: '清蒸鱼', en: 'Steamed fish', meal: '正餐', items: [['鱼', 1, '条'], ['葱', 1, '把']] },
    { name: '土豆炖牛肉', en: 'Beef & potato stew (Chinese style)', meal: '正餐', items: [['牛肉', 1, '斤'], ['土豆', 2, '个'], ['胡萝卜', 1, '根']] },
    { name: '西兰花炒虾仁', en: 'Shrimp with broccoli', meal: '正餐', items: [['西兰花', 1, '个'], ['虾', 0.5, '斤']] },
    { name: '鱼香茄子', en: 'Yu-xiang eggplant', meal: '正餐', items: [['茄子', 2, '根'], ['肉末', 0.2, '斤']] },
    { name: '可乐鸡翅', en: 'Cola chicken wings', meal: '正餐', items: [['鸡翅', 10, '个'], ['可乐', 1, '瓶']] },
    { name: '蒜蓉青菜', en: 'Garlic greens', meal: '正餐', items: [['青菜', 1, '把'], ['大蒜', 1, '头']] },
    { name: '糖醋排骨', en: 'Sweet & sour ribs', meal: '正餐', items: [['排骨', 1, '斤']] },
    { name: '酸辣土豆丝', en: 'Hot & sour shredded potatoes', meal: '正餐', items: [['土豆', 3, '个'], ['青椒', 1, '个']] },
    { name: '蘑菇炒肉', en: 'Pork with mushrooms', meal: '正餐', items: [['蘑菇', 1, '份'], ['瘦肉', 0.4, '斤']] },
    { name: '黄瓜炒蛋', en: 'Cucumber & egg stir-fry', meal: '正餐', items: [['黄瓜', 2, '根'], ['鸡蛋', 3, '个']] },
    { name: '香煎三文鱼', en: 'Pan-seared salmon', meal: '正餐', items: [['三文鱼', 2, '块'], ['西兰花', 1, '个']] },
    { name: '蛋炒饭', en: 'Egg fried rice', meal: '正餐', items: [['米饭', 3, '碗'], ['鸡蛋', 3, '个'], ['火腿', 1, '包'], ['葱', 1, '把']] },
    { name: '白米饭', en: 'Steamed rice', meal: '正餐', items: [['大米', 0.6, '斤']] },
    // ---------- 美式家常菜（英文界面里排在前面）----------
    { name: '燕麦粥配香蕉', en: 'Oatmeal with banana', us: true, meal: '早餐', items: [['燕麦', 0.3, '斤'], ['牛奶', 1, '盒'], ['香蕉', 2, '根']] },
    { name: '炒蛋 + 吐司', en: 'Scrambled eggs & toast', us: true, meal: '早餐', items: [['鸡蛋', 4, '个'], ['吐司', 1, '袋']] },
    { name: '美式松饼', en: 'Pancakes', us: true, meal: '早餐', items: [['面粉', 0.4, '斤'], ['鸡蛋', 2, '个'], ['牛奶', 1, '盒']] },
    { name: '酸奶水果杯', en: 'Yogurt & berry parfait', us: true, meal: '早餐', items: [['酸奶', 3, '盒'], ['草莓', 1, '盒']] },
    { name: '贝果配奶酪', en: 'Bagels with cream cheese', us: true, meal: '早餐', items: [['面包', 3, '个'], ['奶酪', 3, '片']] },
    { name: '早餐卷饼', en: 'Breakfast burritos', us: true, meal: '早餐', items: [['鸡蛋', 4, '个'], ['面包', 3, '个'], ['奶酪', 3, '片'], ['培根', 1, '包']] },
    { name: '肉酱意面', en: 'Spaghetti with meat sauce', us: true, meal: '正餐', items: [['面条', 3, '份'], ['肉末', 0.5, '斤'], ['西红柿', 3, '个'], ['洋葱', 1, '个']] },
    { name: '烤鸡胸沙拉', en: 'Grilled chicken salad', us: true, meal: '正餐', items: [['鸡胸', 2, '块'], ['青菜', 1, '把'], ['西红柿', 2, '个'], ['黄瓜', 1, '根']] },
    { name: '鸡汤面', en: 'Chicken noodle soup', us: true, meal: '正餐', items: [['鸡腿', 4, '个'], ['面条', 2, '份'], ['胡萝卜', 2, '根'], ['洋葱', 1, '个']] },
    { name: '牛肉塔可', en: 'Beef tacos', us: true, meal: '正餐', items: [['肉末', 0.5, '斤'], ['面包', 6, '个'], ['青菜', 1, '把'], ['奶酪', 3, '片'], ['西红柿', 2, '个']] },
    { name: '烤三文鱼配西兰花', en: 'Baked salmon & broccoli', us: true, meal: '正餐', items: [['三文鱼', 2, '块'], ['西兰花', 1, '个']] },
    { name: '汉堡', en: 'Hamburgers', us: true, meal: '正餐', items: [['肉末', 1, '斤'], ['面包', 4, '个'], ['青菜', 1, '把'], ['西红柿', 1, '个'], ['洋葱', 1, '个'], ['奶酪', 4, '片']] },
    { name: '芝士通心粉', en: 'Mac & cheese', us: true, meal: '正餐', items: [['面条', 3, '份'], ['奶酪', 6, '片'], ['牛奶', 1, '盒']] },
    { name: '烤鸡配土豆', en: 'Roast chicken & potatoes', us: true, meal: '正餐', items: [['鸡', 1, '只'], ['土豆', 4, '个'], ['胡萝卜', 2, '根']] },
    { name: '猪排配土豆泥', en: 'Pork chops & mashed potatoes', us: true, meal: '正餐', items: [['猪肉', 1, '斤'], ['土豆', 4, '个'], ['牛奶', 1, '盒']] },
    { name: '美式炖牛肉', en: 'Beef stew', us: true, meal: '正餐', items: [['牛肉', 1, '斤'], ['土豆', 3, '个'], ['胡萝卜', 2, '根'], ['洋葱', 1, '个']] },
    { name: '火鸡三明治', en: 'Turkey sandwiches', us: true, meal: '正餐', items: [['火腿', 1, '包'], ['面包', 4, '个'], ['青菜', 1, '把'], ['奶酪', 4, '片']] },
  ];

  // 把 "猪肉 1斤，青椒 2个" 这样的文字拆成食材列表（自己写菜时用）
  function parseIngredients(text) {
    return String(text || '')
      .split(/[，,、;；\n]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const p = window.Foods.parseItem(part);
        return { name: p.name, qty: p.qty, unit: p.unit };
      });
  }

  // 内置菜谱里食材的英文名（食材在数据里存中文，英文界面显示时翻译）
  const ING_EN = {
    '大米': 'rice',
    '鸡蛋': 'eggs',
    '牛奶': 'milk',
    '面包': 'bread',
    '面粉': 'flour',
    '葱': 'green onions',
    '小米': 'millet',
    '包子': 'steamed buns',
    '豆浆': 'soy milk',
    '油条': 'fried dough sticks',
    '燕麦': 'oats',
    '香蕉': 'bananas',
    '吐司': 'sliced bread',
    '火腿': 'ham / deli meat',
    '生菜': 'lettuce',
    '面条': 'noodles / pasta',
    '西红柿': 'tomatoes',
    '饺子': 'dumplings',
    '红薯': 'sweet potatoes',
    '酸奶': 'yogurt',
    '培根': 'bacon',
    '瘦肉': 'lean pork',
    '青椒': 'green peppers',
    '五花肉': 'pork belly',
    '鸡胸': 'chicken breasts',
    '花生': 'peanuts',
    '黄瓜': 'cucumbers',
    '豆腐': 'tofu',
    '肉末': 'ground meat',
    '鱼': 'fish',
    '牛肉': 'beef',
    '土豆': 'potatoes',
    '胡萝卜': 'carrots',
    '西兰花': 'broccoli',
    '虾': 'shrimp',
    '茄子': 'eggplants',
    '鸡翅': 'chicken wings',
    '可乐': 'cola',
    '青菜': 'leafy greens',
    '大蒜': 'garlic',
    '排骨': 'pork ribs',
    '蘑菇': 'mushrooms',
    '三文鱼': 'salmon',
    '米饭': 'cooked rice',
    '奶酪': 'cheese',
    '草莓': 'berries',
    '洋葱': 'onions',
    '鸡腿': 'chicken thighs',
    '鸡': 'chicken',
    '猪肉': 'pork',
  };

  // 云端数据库不支持"数组里套数组"，所以食材统一转成 { name, qty, unit } 的样子
  const toItem = ([name, qty, unit]) => ({ name, qty, unit });

  window.Recipes = {
    // 菜名和食材名按语言显示：内置的菜有英文名；家人自己写的不翻译
    label(name, lang) {
      if (lang !== 'en') return name;
      const r = RECIPES.find((x) => x.name === name);
      return r && r.en ? r.en : name;
    },
    ingredient(name, lang) {
      return lang === 'en' && ING_EN[name] ? ING_EN[name] : name;
    },
    // 早餐列早餐菜；午餐、晚餐都列正餐菜
    list(meal) {
      const group = meal === '早餐' ? '早餐' : meal ? '正餐' : null;
      return RECIPES.filter((r) => !group || r.meal === group).map((r) => Object.assign({}, r, { items: r.items.map(toItem) }));
    },
    find(name) {
      const r = RECIPES.find((x) => x.name === name);
      return r ? Object.assign({}, r, { items: r.items.map(toItem) }) : null;
    },
    parseIngredients,
  };
})();
