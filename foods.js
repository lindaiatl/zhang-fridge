// 食材资料表：保存天数、单位重量、营养（全部内置，不需要联网、不收费）
// - fridgeDays：冷藏大约能放几天；freezerDays：冷冻大约能放几天（0 表示不适合冷冻）
// - unit / grams：这种食材最常用的单位，以及 1 个单位大约多少克
// - kcal / protein：每 100 克的热量（千卡）和蛋白质（克），参考常见食物成分表，是估算值
// 匹配时从上往下找，名字里包含关键词就算命中，所以更具体的词要放在前面（如"酸奶"在"奶"前，"鸡胸"在"鸡"前）
(function () {
  const FOODS = [
    // 奶、蛋
    { keywords: ['奶酪', '芝士'], unit: '片', grams: 20, kcal: 328, protein: 25.7, fridgeDays: 30, freezerDays: 90 },
    { keywords: ['酸奶'], unit: '盒', grams: 200, kcal: 72, protein: 3.2, fridgeDays: 14, freezerDays: 0 },
    { keywords: ['牛奶', '特仑苏', '奶'], unit: '盒', grams: 250, kcal: 66, protein: 3.4, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['鸡蛋', '鸭蛋', '蛋'], unit: '个', grams: 50, kcal: 144, protein: 13.3, fridgeDays: 30, freezerDays: 0 },

    // 肉
    { keywords: ['和牛'], unit: '块', grams: 200, kcal: 250, protein: 17, fridgeDays: 3, freezerDays: 90 },
    { keywords: ['牛肉', '牛排', '牛腩'], unit: '斤', grams: 500, kcal: 125, protein: 20, fridgeDays: 3, freezerDays: 120 },
    { keywords: ['羊肉'], unit: '斤', grams: 500, kcal: 203, protein: 19, fridgeDays: 3, freezerDays: 120 },
    { keywords: ['排骨'], unit: '斤', grams: 500, kcal: 278, protein: 16.7, fridgeDays: 3, freezerDays: 90 },
    { keywords: ['瘦肉', '里脊'], unit: '斤', grams: 500, kcal: 143, protein: 20.3, fridgeDays: 3, freezerDays: 90 },
    { keywords: ['五花肉', '猪肉', '肉馅', '肉末'], unit: '斤', grams: 500, kcal: 395, protein: 13.2, fridgeDays: 3, freezerDays: 90 },
    { keywords: ['培根', '火腿', '香肠'], unit: '包', grams: 200, kcal: 330, protein: 15, fridgeDays: 7, freezerDays: 60 },
    { keywords: ['鸡胸'], unit: '块', grams: 200, kcal: 133, protein: 24.6, fridgeDays: 2, freezerDays: 90 },
    { keywords: ['鸡腿'], unit: '个', grams: 150, kcal: 181, protein: 16, fridgeDays: 2, freezerDays: 90 },
    { keywords: ['鸡翅'], unit: '个', grams: 50, kcal: 194, protein: 17.4, fridgeDays: 2, freezerDays: 90 },
    { keywords: ['鸡'], unit: '只', grams: 1000, kcal: 167, protein: 19.3, fridgeDays: 2, freezerDays: 90 },

    // 水产
    { keywords: ['三文鱼'], unit: '块', grams: 200, kcal: 139, protein: 17.2, fridgeDays: 2, freezerDays: 90 },
    { keywords: ['虾'], unit: '斤', grams: 500, kcal: 93, protein: 18.6, fridgeDays: 2, freezerDays: 90 },
    { keywords: ['鱼'], unit: '条', grams: 500, kcal: 100, protein: 17, fridgeDays: 2, freezerDays: 90 },

    // 豆制品、主食
    { keywords: ['豆腐'], unit: '块', grams: 300, kcal: 81, protein: 8.1, fridgeDays: 3, freezerDays: 30 },
    { keywords: ['饺子', '馄饨', '包子'], unit: '袋', grams: 500, kcal: 240, protein: 9, fridgeDays: 2, freezerDays: 90 },
    { keywords: ['米饭', '剩饭'], unit: '碗', grams: 200, kcal: 116, protein: 2.6, fridgeDays: 2, freezerDays: 30 },
    { keywords: ['面包', '吐司'], unit: '个', grams: 80, kcal: 313, protein: 8.3, fridgeDays: 5, freezerDays: 30 },
    { keywords: ['面条', '面'], unit: '份', grams: 200, kcal: 110, protein: 3.5, fridgeDays: 3, freezerDays: 30 },
    { keywords: ['剩菜'], unit: '份', grams: 300, kcal: 120, protein: 5, fridgeDays: 2, freezerDays: 30 },

    // 蔬菜
    { keywords: ['西红柿', '番茄'], unit: '个', grams: 150, kcal: 20, protein: 0.9, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['黄瓜'], unit: '根', grams: 200, kcal: 16, protein: 0.8, fridgeDays: 5, freezerDays: 0 },
    { keywords: ['土豆'], unit: '个', grams: 200, kcal: 81, protein: 2.6, fridgeDays: 30, freezerDays: 0 },
    { keywords: ['胡萝卜'], unit: '根', grams: 150, kcal: 39, protein: 1, fridgeDays: 14, freezerDays: 0 },
    { keywords: ['洋葱'], unit: '个', grams: 200, kcal: 40, protein: 1.1, fridgeDays: 30, freezerDays: 0 },
    { keywords: ['西兰花', '花菜'], unit: '个', grams: 400, kcal: 36, protein: 4.1, fridgeDays: 5, freezerDays: 0 },
    { keywords: ['豆芽'], unit: '份', grams: 250, kcal: 18, protein: 2.1, fridgeDays: 2, freezerDays: 0 },
    { keywords: ['蘑菇', '香菇', '金针菇'], unit: '份', grams: 200, kcal: 26, protein: 2.2, fridgeDays: 4, freezerDays: 0 },
    { keywords: ['青椒', '辣椒', '彩椒'], unit: '个', grams: 100, kcal: 22, protein: 1, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['茄子'], unit: '根', grams: 250, kcal: 23, protein: 1.1, fridgeDays: 5, freezerDays: 0 },
    { keywords: ['青菜', '白菜', '菠菜', '生菜', '油菜', '小白菜', '空心菜', '芹菜'], unit: '把', grams: 300, kcal: 20, protein: 1.5, fridgeDays: 4, freezerDays: 0 },

    // 水果
    { keywords: ['苹果'], unit: '个', grams: 200, kcal: 53, protein: 0.4, fridgeDays: 30, freezerDays: 0 },
    { keywords: ['香蕉'], unit: '根', grams: 120, kcal: 93, protein: 1.4, fridgeDays: 5, freezerDays: 0 },
    { keywords: ['橙子', '橘子', '柑'], unit: '个', grams: 200, kcal: 48, protein: 0.8, fridgeDays: 14, freezerDays: 0 },
    { keywords: ['葡萄'], unit: '斤', grams: 500, kcal: 44, protein: 0.5, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['草莓', '蓝莓'], unit: '盒', grams: 250, kcal: 32, protein: 1, fridgeDays: 3, freezerDays: 90 },

    // 调味品：一般不会整瓶吃掉，营养按 0 算
    { keywords: ['生抽', '老抽', '酱油', '醋', '盐', '糖', '油', '酱', '料酒'], unit: '瓶', grams: 500, kcal: 0, protein: 0, fridgeDays: 180, freezerDays: 0 },
  ];

  // 表里没有的食材：保存天数给个保守的默认值，营养标为"未收录"
  const UNKNOWN = { unit: '份', grams: 0, kcal: 0, protein: 0, fridgeDays: 5, freezerDays: 30, known: false };

  // 按重量计算的单位：1 个单位多少克
  const WEIGHT_UNITS = { 斤: 500, 两: 50, 公斤: 1000, 千克: 1000, kg: 1000, 克: 1, g: 1 };
  const UNIT_PATTERN = '斤|两|公斤|千克|kg|克|g|个|盒|块|瓶|根|条|份|碗|袋|把|只|颗|包|罐|片|串';

  function lookup(name) {
    const food = FOODS.find((row) => row.keywords.some((word) => name.indexOf(word) !== -1));
    return food ? Object.assign({ known: true }, food) : Object.assign({}, UNKNOWN);
  }

  // 从文字里拆出名字、数量、单位
  // 例如 "🥚 农家土鸡蛋 (10个)" / "猪肉 1斤" / "牛奶2盒" → { name, qty, unit }；没写数量就按 1 个默认单位
  function parseItem(text) {
    const raw = String(text || '').trim();
    const re = new RegExp(`[（(]?\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\s*[)）]?\\s*$`, 'i');
    const match = raw.match(re);
    if (match) {
      const name = raw.slice(0, match.index).trim() || raw;
      return { name, qty: parseFloat(match[1]), unit: match[2] };
    }
    return { name: raw, qty: 1, unit: lookup(raw).unit };
  }

  // 某个数量大约多少克（不知道时返回 0）
  function toGrams(name, qty, unit) {
    if (WEIGHT_UNITS[unit]) return qty * WEIGHT_UNITS[unit];
    const food = lookup(name);
    // 用这种食材自己的单位（比如鸡蛋的"个"）换算；其他单位（比如"袋"）按 1 份估算
    return food.grams ? qty * food.grams : 0;
  }

  // 吃掉一定数量时的热量和蛋白质
  function nutritionFor(name, qty, unit) {
    const food = lookup(name);
    const grams = toGrams(name, qty, unit);
    if (!food.known || !grams) return { kcal: 0, protein: 0, known: false };
    return {
      kcal: Math.round((food.kcal * grams) / 100),
      protein: Math.round((food.protein * grams) / 10) / 10,
      known: true,
    };
  }

  // 冷藏 / 冷冻时大约能放几天（冷冻不适合的食材就按冷藏算）
  function shelfDays(name, storage) {
    const food = lookup(name);
    if (storage === '冷冻' && food.freezerDays > 0) return food.freezerDays;
    return food.fridgeDays;
  }

  function canFreeze(name) {
    return lookup(name).freezerDays > 0;
  }

  // 数字显示得干净一点：1.50 → 1.5，2.0 → 2
  function formatQty(qty) {
    return String(Math.round(qty * 100) / 100);
  }

  // 今天的日期，格式 2026-10-05，用来按天统计
  function todayString() {
    const d = new Date();
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  window.Foods = {
    lookup,
    parseItem,
    nutritionFor,
    shelfDays,
    canFreeze,
    formatQty,
    todayString,
  };
})();
