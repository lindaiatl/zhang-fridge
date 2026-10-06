// 常见食材营养估算表（每"1 个单位"的大约数值，例如 1 盒牛奶、1 个鸡蛋）
// 数值是家庭参考用的粗略估计，不是精确的营养标签
// 匹配时从上往下找，名字里包含关键词就算命中，所以更具体的词要放在前面（如"和牛"在"牛肉"前）
const NUTRITION_TABLE = [
  { keywords: ['酸奶'], unit: '盒', kcal: 150, protein: 5 },
  { keywords: ['牛奶', '特仑苏'], unit: '盒', kcal: 170, protein: 9 },
  { keywords: ['和牛'], unit: '块', kcal: 500, protein: 34 },
  { keywords: ['牛肉', '牛排'], unit: '块', kcal: 250, protein: 40 },
  { keywords: ['鸡蛋', '蛋'], unit: '个', kcal: 70, protein: 6 },
  { keywords: ['鸡胸'], unit: '块', kcal: 260, protein: 46 },
  { keywords: ['鸡腿'], unit: '个', kcal: 250, protein: 22 },
  { keywords: ['猪肉', '排骨'], unit: '份', kcal: 300, protein: 30 },
  { keywords: ['虾'], unit: '份', kcal: 140, protein: 28 },
  { keywords: ['鱼'], unit: '条', kcal: 300, protein: 40 },
  { keywords: ['豆腐'], unit: '块', kcal: 250, protein: 24 },
  { keywords: ['米饭'], unit: '碗', kcal: 230, protein: 5 },
  { keywords: ['面条', '面'], unit: '份', kcal: 280, protein: 9 },
  { keywords: ['面包'], unit: '个', kcal: 250, protein: 8 },
  { keywords: ['苹果'], unit: '个', kcal: 95, protein: 0.5 },
  { keywords: ['香蕉'], unit: '根', kcal: 105, protein: 1.3 },
  { keywords: ['西红柿', '番茄'], unit: '个', kcal: 30, protein: 1.5 },
  { keywords: ['青菜', '白菜', '菠菜', '生菜'], unit: '份', kcal: 30, protein: 2.5 },
  // 调味品一般不会整瓶吃掉，按 0 计算
  { keywords: ['生抽', '酱油', '醋', '盐', '糖'], unit: '瓶', kcal: 0, protein: 0 },
];

// 从名字里读出数量，例如 "🥚 农家土鸡蛋 (10个)" → 10；没写数量就按 1 算
function parseCount(name) {
  const match = name.match(/[（(]\s*(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 1;
}

// 估算一件食材整份的热量和蛋白质
// 返回 { kcal, protein, known }，known 为 false 表示表里没收录这个食材
function estimateNutrition(name) {
  const count = parseCount(name);
  const entry = NUTRITION_TABLE.find((row) =>
    row.keywords.some((word) => name.indexOf(word) !== -1)
  );
  if (!entry) {
    return { kcal: 0, protein: 0, known: false };
  }
  return {
    kcal: Math.round(entry.kcal * count),
    protein: Math.round(entry.protein * count * 10) / 10,
    known: true,
  };
}

// 今天的日期，格式 2026-10-05，用来按天统计
function todayString() {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 网页版没有 module.exports，直接挂到 window 上给其他文件用
window.Nutrition = {
  estimateNutrition,
  todayString,
};
