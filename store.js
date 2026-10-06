// 数据层：所有数据的读写都集中在这里
// - 没填 Firebase 配置时：数据只存在这台设备的浏览器里（localStorage）
// - 填了 Firebase 配置后：数据存在云端，同一个家庭的所有人实时共享；浏览器里也留一份，打开时先显示
(function () {
  const KEYS = ['foodList', 'shoppingList', 'eatenLog', 'members'];

  // 把"几天后"换算成具体日期，例如 daysFromToday(5) → 5 天后的 2026-10-10
  function daysFromToday(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // 第一次打开时的默认数据，和小程序保持一致
  function defaultData(cloud) {
    return {
      foodList: [
        { id: 'milk', name: '🥛 特仑苏牛奶 (3盒)', expireDate: daysFromToday(1), addedBy: '妈妈放入', owner: '宝贝' },
        { id: 'beef', name: '🥩 澳洲和牛 (1块)', expireDate: daysFromToday(5), addedBy: '爸爸放入', owner: '爸爸' },
      ],
      shoppingList: [
        { id: 'soy_sauce', name: '🧂 厨邦生抽 (1瓶)', requester: '爸爸需要', bought: false },
        { id: 'eggs', name: '🥚 农家土鸡蛋 (10个)', requester: '妈妈需要', bought: false },
      ],
      eatenLog: [],
      // 云端模式下，成员是每个人打开时自己选称呼加进来的，所以一开始是空的
      members: cloud ? [] : [{ avatar: '👤', name: '我', role: '管理员' }],
    };
  }

  // 浏览器存储；隐私模式等情况下存不了也不会出错
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // 存不进去就只保留在内存里
    }
  }

  // 生成一串不容易被猜到的编号，用作家庭 ID 和设备 ID
  function randomId(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉了容易看错的 0 O 1 I
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
  }

  const cloudConfig = window.FIREBASE_CONFIG;
  const isCloud = !!(cloudConfig && cloudConfig.apiKey && window.firebase);

  // 家庭 ID：优先用邀请链接里的 ?family=xxx，其次用这台设备上次的家庭，都没有就新建一个家庭
  const urlFamily = new URLSearchParams(location.search).get('family');
  const familyId = isCloud ? (urlFamily || read('fridge.familyId', null) || randomId(10)) : 'LOCAL';
  if (isCloud) write('fridge.familyId', familyId);

  // 这台设备的编号，用来认出"我"是成员列表里的哪一位
  let deviceId = read('fridge.deviceId', null);
  if (!deviceId) {
    deviceId = randomId(12);
    write('fridge.deviceId', deviceId);
  }

  // 不同家庭的数据在浏览器里分开存，换家庭时不会串
  const cacheKey = (key) => (isCloud ? `fridge.${familyId}.${key}` : `fridge.${key}`);

  const defaults = defaultData(isCloud);
  const state = {};
  KEYS.forEach((key) => {
    const value = read(cacheKey(key), null);
    // 只有从没存过才用默认数据；冰箱被吃空了也要保持空，不能又冒出默认食材
    state[key] = value !== null ? value : defaults[key];
  });

  const listeners = [];
  function notify(key) {
    listeners.forEach((fn) => fn(key, state[key]));
  }

  // ---------- 云端同步 ----------
  let docs = null;
  let readyResolve;
  const ready = new Promise((resolve) => (readyResolve = resolve));

  if (isCloud) {
    firebase.initializeApp(cloudConfig);
    const db = firebase.firestore();
    // 每个家庭在云端是 families/家庭ID/data/ 下面的 4 份数据
    docs = {};
    KEYS.forEach((key) => {
      docs[key] = db.collection('families').doc(familyId).collection('data').doc(key);
    });

    // 匿名登录：不需要账号密码，只是让云端知道这是一位真实访客
    firebase
      .auth()
      .signInAnonymously()
      .then(() => {
        let pending = KEYS.length;
        KEYS.forEach((key) => {
          let first = true;
          // 实时监听：家里任何人改了数据，这里几秒内自动收到
          docs[key].onSnapshot(
            (snap) => {
              if (snap.exists) {
                state[key] = snap.data().value || [];
                write(cacheKey(key), state[key]);
                notify(key);
              } else if (first) {
                // 新家庭第一次打开：把默认数据放上云端
                docs[key].set({ value: state[key] });
              }
              if (first) {
                first = false;
                if (--pending === 0) readyResolve(true);
              }
            },
            (err) => {
              console.error('云端同步失败', key, err);
              if (first) {
                first = false;
                if (--pending === 0) readyResolve(false);
              }
            }
          );
        });
      })
      .catch((err) => {
        console.error('匿名登录失败', err);
        readyResolve(false);
      });
  } else {
    KEYS.forEach((key) => write(cacheKey(key), state[key]));
    readyResolve(true);
  }

  window.Store = {
    daysFromToday,
    isCloud,
    familyId,
    deviceId,
    // 云端数据第一次到达后才算准备好（本地模式立刻就好）
    ready,

    get(key) {
      return state[key];
    },

    // 更新一项数据：先更新本机并刷新页面，再同步到云端给其他家人
    set(key, value) {
      state[key] = value;
      write(cacheKey(key), value);
      notify(key);
      if (docs) {
        docs[key].set({ value }).catch((err) => console.error('保存到云端失败', key, err));
      }
    },

    // 页面注册监听，数据一变就重新渲染
    watch(fn) {
      listeners.push(fn);
    },

    // 邀请链接：带上家庭 ID，家人点开就进到同一个冰箱
    inviteUrl() {
      const url = new URL(location.href);
      url.search = '';
      url.hash = '';
      if (isCloud) url.searchParams.set('family', familyId);
      return url.toString();
    },
  };
})();
