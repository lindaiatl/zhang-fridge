// 常用中文食材名 → 英文名（英文界面显示用；数据里仍存中文）
// 名字完全一样才直接换成英文；认不出全名的，会显示成"中文名 (英文类别)"
(function () {
  const ZH_EN = {
    // 主食
    馒头: 'steamed buns', 包子: 'stuffed buns', 花卷: 'flower rolls', 饺子: 'dumplings', 水饺: 'dumplings', 馄饨: 'wontons',
    面条: 'noodles', 挂面: 'dried noodles', 方便面: 'instant noodles', 意面: 'pasta', 米饭: 'cooked rice', 剩饭: 'leftover rice',
    大米: 'rice', 糯米: 'glutinous rice', 小米: 'millet', 燕麦: 'oats', 燕麦片: 'oatmeal', 面粉: 'flour', 面包: 'bread',
    吐司: 'sliced bread', 油条: 'fried dough sticks', 年糕: 'rice cakes', 粽子: 'zongzi', 汤圆: 'tangyuan', 月饼: 'mooncakes',
    蛋糕: 'cake', 饼干: 'cookies', 玉米: 'corn', 红薯: 'sweet potatoes', 地瓜: 'sweet potatoes', 山药: 'Chinese yam', 芋头: 'taro',
    // 豆类、豆制品
    黑豆: 'black beans', 黄豆: 'soybeans', 红豆: 'red beans', 绿豆: 'mung beans', 豌豆: 'peas', 毛豆: 'edamame',
    豆腐: 'tofu', 嫩豆腐: 'soft tofu', 老豆腐: 'firm tofu', 豆腐干: 'dried tofu', 腐竹: 'tofu skin', 豆浆: 'soy milk',
    豆芽: 'bean sprouts', 绿豆芽: 'mung bean sprouts', 黄豆芽: 'soybean sprouts', 花生: 'peanuts', 核桃: 'walnuts', 红枣: 'jujubes',
    // 蛋奶
    鸡蛋: 'eggs', 鸭蛋: 'duck eggs', 咸鸭蛋: 'salted duck eggs', 皮蛋: 'century eggs', 鹌鹑蛋: 'quail eggs',
    牛奶: 'milk', 酸奶: 'yogurt', 奶酪: 'cheese', 芝士: 'cheese', 黄油: 'butter', 奶油: 'cream',
    // 肉
    猪肉: 'pork', 五花肉: 'pork belly', 瘦肉: 'lean pork', 里脊: 'tenderloin', 排骨: 'pork ribs', 猪蹄: 'pig trotters',
    肉末: 'ground meat', 肉馅: 'ground meat', 牛肉: 'beef', 牛排: 'steak', 牛腩: 'beef brisket', 和牛: 'wagyu', 羊肉: 'lamb',
    鸡肉: 'chicken', 鸡: 'chicken', 鸡胸: 'chicken breast', 鸡胸肉: 'chicken breast', 鸡腿: 'chicken legs', 鸡翅: 'chicken wings',
    鸡爪: 'chicken feet', 鸭: 'duck', 鸭肉: 'duck', 火腿: 'ham', 培根: 'bacon', 香肠: 'sausages', 腊肠: 'Chinese sausage', 腊肉: 'cured pork',
    // 水产
    鱼: 'fish', 三文鱼: 'salmon', 鲈鱼: 'sea bass', 鲫鱼: 'crucian carp', 带鱼: 'hairtail', 鳕鱼: 'cod', 虾: 'shrimp', 虾仁: 'shelled shrimp',
    螃蟹: 'crab', 蛤蜊: 'clams', 扇贝: 'scallops', 鱿鱼: 'squid', 海带: 'kelp', 紫菜: 'seaweed',
    // 蔬菜
    青菜: 'leafy greens', 白菜: 'napa cabbage', 大白菜: 'napa cabbage', 小白菜: 'bok choy', 油菜: 'bok choy', 菠菜: 'spinach',
    生菜: 'lettuce', 芹菜: 'celery', 韭菜: 'chives', 空心菜: 'water spinach', 油麦菜: 'romaine lettuce', 卷心菜: 'cabbage', 包菜: 'cabbage',
    西兰花: 'broccoli', 花菜: 'cauliflower', 菜花: 'cauliflower', 西红柿: 'tomatoes', 番茄: 'tomatoes', 黄瓜: 'cucumbers',
    土豆: 'potatoes', 胡萝卜: 'carrots', 白萝卜: 'daikon', 萝卜: 'radish', 洋葱: 'onions', 青椒: 'green peppers', 彩椒: 'bell peppers',
    辣椒: 'chili peppers', 茄子: 'eggplant', 南瓜: 'pumpkin', 冬瓜: 'winter melon', 丝瓜: 'loofah', 苦瓜: 'bitter melon',
    西葫芦: 'zucchini', 莲藕: 'lotus root', 藕: 'lotus root', 竹笋: 'bamboo shoots', 豆角: 'green beans', 四季豆: 'green beans',
    蘑菇: 'mushrooms', 香菇: 'shiitake mushrooms', 金针菇: 'enoki mushrooms', 木耳: 'wood ear mushrooms',
    葱: 'green onions', 大葱: 'leeks', 小葱: 'scallions', 姜: 'ginger', 大蒜: 'garlic', 蒜: 'garlic', 香菜: 'cilantro',
    // 水果
    苹果: 'apples', 香蕉: 'bananas', 橙子: 'oranges', 橘子: 'tangerines', 柠檬: 'lemons', 葡萄: 'grapes', 草莓: 'strawberries',
    蓝莓: 'blueberries', 西瓜: 'watermelon', 哈密瓜: 'cantaloupe', 甜瓜: 'melon', 桃: 'peaches', 桃子: 'peaches', 水蜜桃: 'peaches',
    梨: 'pears', 芒果: 'mangoes', 猕猴桃: 'kiwis', 奇异果: 'kiwis', 菠萝: 'pineapple', 樱桃: 'cherries', 李子: 'plums', 柚子: 'pomelo',
    火龙果: 'dragon fruit', 荔枝: 'lychees', 龙眼: 'longans', 石榴: 'pomegranate', 牛油果: 'avocados',
    // 饮料
    水: 'water', 矿泉水: 'mineral water', 果汁: 'juice', 可乐: 'cola', 啤酒: 'beer', 汽水: 'soda', 茶: 'tea', 咖啡: 'coffee',
    // 调料
    盐: 'salt', 糖: 'sugar', 白糖: 'sugar', 冰糖: 'rock sugar', 生抽: 'light soy sauce', 老抽: 'dark soy sauce', 酱油: 'soy sauce',
    蚝油: 'oyster sauce', 醋: 'vinegar', 料酒: 'cooking wine', 味精: 'MSG', 鸡精: 'chicken bouillon', 胡椒: 'pepper', 胡椒粉: 'pepper',
    花椒: 'Sichuan peppercorns', 八角: 'star anise', 辣椒酱: 'chili sauce', 老干妈辣酱: 'Lao Gan Ma chili crisp', 老干妈: 'Lao Gan Ma chili crisp',
    豆瓣酱: 'bean paste', 番茄酱: 'ketchup', 芝麻酱: 'sesame paste', 沙拉酱: 'salad dressing', 香油: 'sesame oil', 芝麻油: 'sesame oil',
    食用油: 'cooking oil', 花生油: 'peanut oil', 橄榄油: 'olive oil', 蜂蜜: 'honey', 腐乳: 'fermented tofu', 玫瑰腐乳: 'rose fermented tofu',
    腌黄瓜: 'pickled cucumbers', 榨菜: 'pickled mustard greens', 咸菜: 'pickles',
  };

  // 英文界面显示的食材名：
  // - 名字（去掉表情符号、空格后）完全认得 → 直接英文
  // - 能认出是哪类食材 → "中文名 (英文类别)"，例如 "特仑苏牛奶 (milk)"
  // - 都认不出 → 原样显示
  function englishName(name) {
    const raw = String(name || '');
    if (!/[一-龥]/.test(raw)) return raw;
    const clean = raw.replace(/[^一-龥]/g, '');
    if (ZH_EN[clean]) return ZH_EN[clean];
    const food = window.Foods.lookup(raw);
    if (food.known) {
      const hit = food.keywords.find((k) => k[0] !== '=' && clean.indexOf(k) !== -1);
      if (hit && ZH_EN[hit]) return `${raw} (${ZH_EN[hit]})`;
    }
    return raw;
  }

  window.FoodNames = { englishName };
})();
