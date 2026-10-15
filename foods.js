// 食材资料表：保存天数、单位重量、营养（全部内置，不需要联网、不收费）
// - fridgeDays：冷藏大约能放几天；freezerDays：冷冻大约能放几天（0 表示不适合冷冻）
//   参考美国农业部 FoodKeeper（2026-10 核对），有范围的取较短、较安全的天数；
//   FoodKeeper 没有的（如饺子、油条、红薯、调料）是估算。有包装保质期的，以包装为准
// - unit / grams：这种食材最常用的单位，以及 1 个单位大约多少克
// - kcal / protein：每 100 克的热量（千卡）和蛋白质（克），参考常见食物成分表，是估算值
// 匹配时从上往下找，名字里包含关键词就算命中，所以更具体的词要放在前面（如"酸奶"在"奶"前，"鸡胸"在"鸡"前）
(function () {
  const FOODS = [
    // 奶、蛋
    // 月饼、蛋糕等糕点（放在「鸡蛋」「燕麦」前面，免得「蛋糕」被认成鸡蛋、「燕麦月饼」被认成燕麦）
    { keywords: ['月饼', '蛋糕', '糕点', '点心', '蛋挞', '饼干', '酥'], en: ['cake', 'cupcake', 'pastry', 'pastries', 'mooncake', 'cookie', 'muffin', 'donut', 'doughnut', 'croissant', 'pie', 'brownie'], unit: '个', grams: 100, kcal: 420, protein: 7, fridgeDays: 7, freezerDays: 180 },
    { keywords: ['奶酪', '芝士'], en: ['cheese', 'cream cheese'], unit: '片', grams: 20, kcal: 328, protein: 25.7, fridgeDays: 21, freezerDays: 90 },
    { keywords: ['酸奶'], en: ['yogurt', 'yoghurt', 'greek yogurt'], unit: '盒', grams: 200, kcal: 72, protein: 3.2, fridgeDays: 7, freezerDays: 30 },
    { keywords: ['牛奶', '特仑苏', '奶'], en: ['milk', 'whole milk', 'half and half', 'cream', 'heavy cream'], unit: '盒', grams: 250, kcal: 66, protein: 3.4, fridgeDays: 7, freezerDays: 90 },
    { keywords: ['鸡蛋', '鸭蛋', '蛋'], en: ['egg'], unit: '个', grams: 50, kcal: 144, protein: 13.3, fridgeDays: 21, freezerDays: 0 },

    // 肉
    { keywords: ['和牛'], en: ['wagyu'], unit: '块', grams: 200, kcal: 250, protein: 17, fridgeDays: 3, freezerDays: 120 },
    { keywords: ['牛肉', '牛排', '牛腩'], en: ['beef', 'steak', 'brisket', 'roast beef'], unit: '斤', grams: 500, kcal: 125, protein: 20, fridgeDays: 3, freezerDays: 120 },
    { keywords: ['羊肉'], en: ['lamb', 'mutton'], unit: '斤', grams: 500, kcal: 203, protein: 19, fridgeDays: 3, freezerDays: 120 },
    { keywords: ['排骨'], en: ['ribs', 'spare ribs', 'pork ribs', 'baby back ribs'], unit: '斤', grams: 500, kcal: 278, protein: 16.7, fridgeDays: 3, freezerDays: 120 },
    // 肉末、肉馅：绞碎的肉坏得快，冷藏只能放 1～2 天
    { keywords: ['肉末', '肉馅', '绞肉'], en: ['ground beef', 'ground pork', 'ground turkey', 'ground chicken', 'ground meat', 'minced meat', 'mince'], unit: '斤', grams: 500, kcal: 260, protein: 17, fridgeDays: 1, freezerDays: 90 },
    { keywords: ['瘦肉', '瘦猪肉', '里脊'], en: ['pork loin', 'pork tenderloin', 'lean pork'], unit: '斤', grams: 500, kcal: 143, protein: 20.3, fridgeDays: 3, freezerDays: 120 },
    { keywords: ['五花肉', '猪肉'], en: ['pork', 'pork belly', 'pork chop'], unit: '斤', grams: 500, kcal: 395, protein: 13.2, fridgeDays: 3, freezerDays: 120 },
    { keywords: ['火腿'], en: ['ham', 'deli meat', 'lunch meat', 'turkey slices', 'cold cuts'], unit: '包', grams: 200, kcal: 330, protein: 15, fridgeDays: 3, freezerDays: 30 },
    { keywords: ['培根', '香肠'], en: ['bacon', 'sausage', 'hot dog', 'bratwurst'], unit: '包', grams: 200, kcal: 330, protein: 15, fridgeDays: 7, freezerDays: 30 },
    { keywords: ['鸡胸'], en: ['chicken breast'], unit: '块', grams: 200, kcal: 133, protein: 24.6, fridgeDays: 1, freezerDays: 270 },
    { keywords: ['鸡腿'], en: ['chicken thigh', 'chicken leg', 'drumstick'], unit: '个', grams: 150, kcal: 181, protein: 16, fridgeDays: 1, freezerDays: 270 },
    { keywords: ['鸡翅'], en: ['chicken wing'], unit: '个', grams: 50, kcal: 194, protein: 17.4, fridgeDays: 1, freezerDays: 270 },
    { keywords: ['鸡'], en: ['chicken', 'whole chicken', 'turkey', 'duck', 'rotisserie chicken'], unit: '只', grams: 1000, kcal: 167, protein: 19.3, fridgeDays: 1, freezerDays: 270 },

    // 水产
    { keywords: ['三文鱼'], en: ['salmon'], unit: '块', grams: 200, kcal: 139, protein: 17.2, fridgeDays: 1, freezerDays: 60 },
    { keywords: ['虾'], en: ['shrimp', 'prawn'], unit: '斤', grams: 500, kcal: 93, protein: 18.6, fridgeDays: 1, freezerDays: 180 },
    { keywords: ['鱼'], en: ['fish', 'cod', 'tilapia', 'tuna', 'halibut', 'catfish'], unit: '条', grams: 500, kcal: 100, protein: 17, fridgeDays: 1, freezerDays: 120 },

    // 豆制品、主食
    { keywords: ['豆浆'], en: ['soy milk', 'almond milk', 'oat milk'], unit: '盒', grams: 250, kcal: 31, protein: 3, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['油条'], unit: '根', grams: 80, kcal: 388, protein: 6.9, fridgeDays: 2, freezerDays: 30 },
    { keywords: ['吐司'], en: ['toast', 'sliced bread'], unit: '袋', grams: 400, kcal: 278, protein: 8.8, fridgeDays: 14, freezerDays: 90 },
    { keywords: ['面粉'], en: ['flour'], unit: '斤', grams: 500, kcal: 362, protein: 11.2, fridgeDays: 180, freezerDays: 0 },
    { keywords: ['大米'], en: ['rice', 'uncooked rice'], unit: '斤', grams: 500, kcal: 346, protein: 7.4, fridgeDays: 180, freezerDays: 0 },
    { keywords: ['小米'], en: ['millet'], unit: '斤', grams: 500, kcal: 361, protein: 9, fridgeDays: 180, freezerDays: 0 },
    { keywords: ['燕麦'], en: ['oats', 'oatmeal', 'rolled oats'], unit: '斤', grams: 500, kcal: 367, protein: 15, fridgeDays: 180, freezerDays: 0 },
    { keywords: ['花生'], en: ['peanut', 'peanuts'], unit: '斤', grams: 500, kcal: 574, protein: 24.8, fridgeDays: 360, freezerDays: 0 },
    { keywords: ['红薯'], en: ['sweet potato', 'yam'], unit: '个', grams: 250, kcal: 99, protein: 1.1, fridgeDays: 14, freezerDays: 0 },
    { keywords: ['可乐'], en: ['coke', 'cola'], unit: '瓶', grams: 500, kcal: 43, protein: 0, fridgeDays: 180, freezerDays: 0 },
    { keywords: ['豆腐'], en: ['tofu'], unit: '块', grams: 300, kcal: 81, protein: 8.1, fridgeDays: 7, freezerDays: 150 },
    { keywords: ['饺子', '馄饨', '包子'], en: ['dumpling', 'wonton', 'bao', 'potsticker'], unit: '袋', grams: 500, kcal: 240, protein: 9, fridgeDays: 2, freezerDays: 90 },
    { keywords: ['米饭', '剩饭'], en: ['cooked rice', 'leftover rice'], unit: '碗', grams: 200, kcal: 116, protein: 2.6, fridgeDays: 4, freezerDays: 180 },
    { keywords: ['面包'], en: ['bread', 'bagel', 'bun', 'roll', 'tortilla'], unit: '个', grams: 80, kcal: 313, protein: 8.3, fridgeDays: 14, freezerDays: 90 },
    { keywords: ['面条', '面'], en: ['noodle', 'pasta', 'spaghetti', 'ramen', 'macaroni'], unit: '份', grams: 200, kcal: 110, protein: 3.5, fridgeDays: 3, freezerDays: 30 },
    { keywords: ['剩菜'], en: ['leftover', 'leftovers'], unit: '份', grams: 300, kcal: 120, protein: 5, fridgeDays: 3, freezerDays: 30 },

    // 蔬菜
    { keywords: ['西红柿', '番茄'], en: ['tomato', 'cherry tomato'], unit: '个', grams: 150, kcal: 20, protein: 0.9, fridgeDays: 5, freezerDays: 0 },
    { keywords: ['黄瓜'], en: ['cucumber'], unit: '根', grams: 200, kcal: 16, protein: 0.8, fridgeDays: 4, freezerDays: 0 },
    { keywords: ['土豆'], en: ['potato'], unit: '个', grams: 200, kcal: 81, protein: 2.6, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['胡萝卜'], en: ['carrot', 'baby carrot'], unit: '根', grams: 150, kcal: 39, protein: 1, fridgeDays: 14, freezerDays: 0 },
    { keywords: ['洋葱'], en: ['onion'], unit: '个', grams: 200, kcal: 40, protein: 1.1, fridgeDays: 60, freezerDays: 0 },
    { keywords: ['西兰花', '花菜'], en: ['broccoli', 'cauliflower'], unit: '个', grams: 400, kcal: 36, protein: 4.1, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['豆芽'], en: ['bean sprout', 'sprout'], unit: '份', grams: 250, kcal: 18, protein: 2.1, fridgeDays: 5, freezerDays: 0 },
    { keywords: ['蘑菇', '香菇', '金针菇'], en: ['mushroom'], unit: '份', grams: 200, kcal: 26, protein: 2.2, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['青椒', '辣椒', '彩椒'], en: ['bell pepper', 'pepper', 'jalapeno', 'chili'], unit: '个', grams: 100, kcal: 22, protein: 1, fridgeDays: 4, freezerDays: 0 },
    { keywords: ['茄子'], en: ['eggplant'], unit: '根', grams: 250, kcal: 23, protein: 1.1, fridgeDays: 4, freezerDays: 0 },
    { keywords: ['大蒜', '蒜'], en: ['garlic'], unit: '头', grams: 50, kcal: 128, protein: 4.5, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['葱', '姜', '香菜'], en: ['green onion', 'scallion', 'ginger', 'cilantro', 'parsley'], unit: '把', grams: 100, kcal: 30, protein: 1.6, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['青菜', '白菜', '菠菜', '生菜', '油菜', '小白菜', '空心菜', '芹菜', '油麦菜', '韭菜'], en: ['lettuce', 'spinach', 'cabbage', 'bok choy', 'kale', 'celery', 'greens', 'salad', 'zucchini', 'asparagus', 'green bean'], unit: '把', grams: 300, kcal: 20, protein: 1.5, fridgeDays: 3, freezerDays: 0 },

    // 水果
    { keywords: ['西瓜'], en: ['watermelon'], unit: '个', grams: 4000, kcal: 31, protein: 0.5, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['哈密瓜', '甜瓜'], en: ['cantaloupe', 'melon', 'honeydew'], unit: '个', grams: 1500, kcal: 34, protein: 0.5, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['桃'], en: ['peach', 'nectarine', 'plum'], unit: '个', grams: 200, kcal: 42, protein: 0.6, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['梨'], en: ['pear'], unit: '个', grams: 250, kcal: 50, protein: 0.4, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['芒果'], en: ['mango'], unit: '个', grams: 300, kcal: 35, protein: 0.6, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['猕猴桃', '奇异果'], en: ['kiwi'], unit: '个', grams: 100, kcal: 61, protein: 0.8, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['苹果'], en: ['apple'], unit: '个', grams: 200, kcal: 53, protein: 0.4, fridgeDays: 28, freezerDays: 0 },
    { keywords: ['香蕉'], en: ['banana'], unit: '根', grams: 120, kcal: 93, protein: 1.4, fridgeDays: 3, freezerDays: 0 },
    { keywords: ['橙子', '橘子', '柑'], en: ['orange', 'tangerine', 'clementine', 'lemon', 'lime', 'grapefruit'], unit: '个', grams: 200, kcal: 48, protein: 0.8, fridgeDays: 10, freezerDays: 0 },
    { keywords: ['葡萄'], en: ['grape'], unit: '斤', grams: 500, kcal: 44, protein: 0.5, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['草莓', '蓝莓'], en: ['strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry', 'raspberries', 'berry', 'berries'], unit: '盒', grams: 250, kcal: 32, protein: 1, fridgeDays: 3, freezerDays: 360 },

    // 饮料（"=水" 表示名字正好是"水"才算，免得"水果""水饺"被当成水）
    { keywords: ['矿泉水', '纯净水', '苏打水', '饮用水', '=水'], en: ['water', 'sparkling water', 'bottled water'], unit: '瓶', grams: 550, kcal: 0, protein: 0, fridgeDays: 365, freezerDays: 0 },
    { keywords: ['果汁'], en: ['juice', 'orange juice', 'apple juice'], unit: '盒', grams: 1000, kcal: 45, protein: 0.5, fridgeDays: 7, freezerDays: 0 },
    { keywords: ['啤酒'], en: ['beer'], unit: '瓶', grams: 500, kcal: 32, protein: 0.4, fridgeDays: 180, freezerDays: 0 },
    { keywords: ['汽水', '饮料'], en: ['soda', 'soft drink', 'sparkling drink'], unit: '瓶', grams: 500, kcal: 40, protein: 0, fridgeDays: 180, freezerDays: 0 },

    // 调料：放在冰箱的"调料区"，不倒计时；一般不会整瓶吃掉，营养按 0 算
    { keywords: ['生抽', '老抽', '酱油', '蚝油', '醋', '盐', '糖', '料酒', '味精', '鸡精', '胡椒', '花椒', '八角', '辣椒酱', '豆瓣酱', '番茄酱', '芝麻酱', '沙拉酱', '油', '酱'], en: ['soy sauce', 'sauce', 'oyster sauce', 'hot sauce', 'salt', 'sugar', 'vinegar', 'oil', 'olive oil', 'ketchup', 'mayo', 'mayonnaise', 'mustard', 'black pepper', 'spice', 'seasoning', 'honey', 'syrup', 'maple syrup', 'jam', 'dressing', 'salad dressing', 'sriracha', 'cooking wine'], unit: '瓶', grams: 500, kcal: 0, protein: 0, fridgeDays: 365, freezerDays: 0, seasoning: true },
  ];

  // 表里没有的食材：保存天数给个保守的默认值，营养标为"未收录"
  // 不确定能不能冻，所以默认不显示「冻起来」
  const UNKNOWN = { unit: '份', grams: 0, kcal: 0, protein: 0, fridgeDays: 3, freezerDays: 0, known: false };

  // 按重量计算的单位：1 个单位多少克
  // 液体按 1 毫升 ≈ 1 克估算（加仑、夸脱、品脱是美国常用的牛奶、果汁单位）
  const WEIGHT_UNITS = {
    斤: 500, 两: 50, 公斤: 1000, 千克: 1000, kg: 1000, 克: 1, g: 1,
    磅: 453.6, lb: 453.6, lbs: 453.6, 盎司: 28.35, oz: 28.35,
    加仑: 3785, 夸脱: 946, 品脱: 473, 升: 1000, l: 1000, L: 1000, 毫升: 1, ml: 1,
  };
  // 长的写在前面，免得"公斤"被认成"斤"
  const UNIT_PATTERN = '加仑|夸脱|品脱|盎司|公斤|千克|毫升|lbs|lb|oz|kg|ml|斤|两|克|g|磅|个|盒|块|瓶|根|条|份|碗|袋|把|只|颗|包|罐|片|串|头|箱|提|桶|升|l';

  // 英文单位 → App 里统一用的单位（数量的单位存成中文，显示时再按语言翻译）
  const EN_UNITS = {
    pc: '个', pcs: '个', piece: '个', pieces: '个', ct: '个', count: '个', each: '个', ea: '个', loaf: '个', loaves: '个',
    box: '盒', boxes: '盒', carton: '盒', cartons: '盒',
    bottle: '瓶', bottles: '瓶', jar: '瓶', jars: '瓶',
    can: '罐', cans: '罐', bag: '袋', bags: '袋', pack: '包', packs: '包', package: '包', packages: '包', pkg: '包',
    bunch: '把', bunches: '把', head: '头', heads: '头', case: '箱', cases: '箱',
    serving: '份', servings: '份', bowl: '碗', bowls: '碗', slice: '片', slices: '片', stick: '根', sticks: '根',
    gallon: '加仑', gallons: '加仑', gal: '加仑', quart: '夸脱', quarts: '夸脱', qt: '夸脱', pint: '品脱', pints: '品脱', pt: '品脱',
    pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb', ounce: 'oz', ounces: 'oz', oz: 'oz',
    kilogram: 'kg', kilograms: 'kg', kg: 'kg', gram: 'g', grams: 'g', g: 'g',
    liter: 'L', liters: 'L', litre: 'L', litres: 'L', l: 'L', ml: 'ml',
  };
  const EN_UNIT_PATTERN = Object.keys(EN_UNITS)
    .concat('dozen', 'doz')
    .sort((a, b) => b.length - a.length)
    .join('|');

  // 英文关键词按"整个单词"匹配（免得 egg 认成 eggplant、ham 认成 hamburger），可带复数 s / es
  function enMatch(text, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}(s|es)?\\b`, 'i').test(text);
  }

  function lookup(name) {
    const text = String(name || '');
    let food = null;
    if (/[一-龥]/.test(text)) {
      // 中文名：按表的顺序找第一个包含关键词的
      const clean = text.replace(/[^一-龥A-Za-z]/g, '');
      food = FOODS.find((row) =>
        row.keywords.some((word) => (word[0] === '=' ? clean === word.slice(1) : text.indexOf(word) !== -1))
      );
    } else {
      // 英文名：找匹配到的最长的词（soy milk 优先于 milk，chicken breast 优先于 chicken）
      let best = 0;
      FOODS.forEach((row) => {
        (row.en || []).forEach((word) => {
          if (word.length > best && enMatch(text, word)) {
            best = word.length;
            food = row;
          }
        });
      });
    }
    return food ? Object.assign({ known: true }, food) : Object.assign({}, UNKNOWN);
  }

  function canonicalUnit(unit) {
    if (!unit) return unit;
    const lower = unit.toLowerCase();
    if (EN_UNITS[lower]) return EN_UNITS[lower];
    return /^[a-z]+$/i.test(unit) ? lower : unit;
  }

  // 从文字里拆出名字、数量、单位，中文英文都认：
  // "🥚 农家土鸡蛋 (10个)" / "猪肉 1斤" / "牛奶2盒" / "milk 1 gallon" / "eggs 12" / "12 eggs" / "2 lb beef" / "a dozen eggs"
  // 没写数量就按 1 个默认单位
  function parseItem(text) {
    // "半加仑""半斤""half gallon" → 0.5；"a dozen" → 1 dozen
    let raw = String(text || '')
      .trim()
      .replace(/半(?=\s*(加仑|斤|公斤|磅|打|盒|瓶|个|箱))/, '0.5')
      .replace(/\bhalf\s+(?=(a\s+)?(gallon|dozen|lb|pound|box|case))/i, '0.5 ')
      .replace(/\b(a|an|one)\s+(?=(dozen|gallon|lb|pound|box|bag|bottle|pack|case|bunch|head|loaf|carton|jar|can)\b)/i, '1 ')
      .replace(/(\d)\s+a\s+(?=dozen)/i, '$1 ');
    const finish = (name, qty, unit) => {
      let u = unit;
      if (u && /^(dozen|doz)$/i.test(u)) {
        qty *= 12;
        u = '个';
      }
      u = canonicalUnit(u) || lookup(name).unit;
      return { name: name || raw, qty, unit: u };
    };
    // 1) 名字在前、数量在后："猪肉 1斤" / "milk 1 gallon" / "eggs 12"
    const tail = new RegExp(`[（(]?\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN}|${EN_UNIT_PATTERN})?\\s*[)）]?\\s*$`, 'i');
    let m = raw.match(tail);
    if (m && raw.slice(0, m.index).trim()) {
      return finish(raw.slice(0, m.index).trim(), parseFloat(m[1]), m[2]);
    }
    // 2) 数量在前："12 eggs" / "2 lb beef" / "1 gallon milk" / "2 dozen eggs"
    const head = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(?:(${EN_UNIT_PATTERN})\\.?\\s+(?:of\\s+)?)?(.+)$`, 'i');
    m = raw.match(head);
    if (m && /[a-z一-龥]/i.test(m[3])) {
      return finish(m[3].trim(), parseFloat(m[1]), m[2]);
    }
    return { name: raw, qty: 1, unit: lookup(raw).unit };
  }

  // 显示用的"数量 + 单位"：英文界面把中文单位翻成英文（斤、两换成克或磅）
  const UNIT_EN = {
    个: ['', ''], 盒: ['box', 'boxes'], 瓶: ['bottle', 'bottles'], 袋: ['bag', 'bags'], 包: ['pack', 'packs'],
    把: ['bunch', 'bunches'], 头: ['head', 'heads'], 块: ['piece', 'pieces'], 根: ['', ''], 条: ['', ''],
    份: ['serving', 'servings'], 碗: ['bowl', 'bowls'], 片: ['slice', 'slices'], 罐: ['can', 'cans'],
    箱: ['case', 'cases'], 只: ['', ''], 颗: ['', ''], 串: ['bunch', 'bunches'], 提: ['pack', 'packs'], 桶: ['tub', 'tubs'],
    加仑: ['gal', 'gal'], 夸脱: ['qt', 'qt'], 品脱: ['pt', 'pt'], 磅: ['lb', 'lb'], 盎司: ['oz', 'oz'],
    公斤: ['kg', 'kg'], 千克: ['kg', 'kg'], 克: ['g', 'g'], 升: ['L', 'L'], 毫升: ['ml', 'ml'],
    lb: ['lb', 'lb'], oz: ['oz', 'oz'], kg: ['kg', 'kg'], g: ['g', 'g'], L: ['L', 'L'], ml: ['ml', 'ml'],
  };
  const UNIT_ZH = { lb: '磅', oz: '盎司', kg: '公斤', g: '克', L: '升', ml: '毫升' };
  function amountText(qty, unit, lang, region) {
    const q = formatQty(qty);
    if (lang !== 'en') return `${q}${UNIT_ZH[unit] || unit || ''}`;
    if (unit === '斤' || unit === '两') {
      const grams = qty * (unit === '斤' ? 500 : 50);
      return region === 'US' ? `${formatQty(Math.round((grams / 453.6) * 10) / 10)} lb` : `${formatQty(Math.round(grams))} g`;
    }
    const names = UNIT_EN[unit];
    if (!names) return `${q} ${unit || ''}`.trim();
    const word = qty === 1 ? names[0] : names[1];
    return word ? `${q} ${word}` : q;
  }

  // 某个数量大约多少克（不知道时返回 0）
  function toGrams(name, qty, unit) {
    const u = canonicalUnit(unit);
    if (WEIGHT_UNITS[u]) return qty * WEIGHT_UNITS[u];
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

  function isSeasoning(name) {
    return !!lookup(name).seasoning;
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
    isSeasoning,
    toGrams,
    formatQty,
    amountText,
    todayString,
  };
})();
