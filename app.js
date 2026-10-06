// 张家大冰箱网页版：页面逻辑
// 功能和小程序一一对应：冰箱（吃光了）、家庭（待买清单、反向入库）、营养大盘
(function () {
  const { estimateNutrition, todayString } = window.Nutrition;
  const $ = (id) => document.getElementById(id);

  // 每人每天的参考摄入量（成年人粗略估算），全家参考量 = 每人参考量 × 家庭成员人数
  const KCAL_PER_PERSON = 2000;
  const PROTEIN_PER_PERSON = 60;

  // 每个称呼对应的小头像
  const OWNER_AVATARS = {
    '宝贝': '👶', '爸爸': '👨', '妈妈': '👩', '爷爷': '👴', '奶奶': '👵', '外公': '👴', '外婆': '👵',
    '哥哥': '🧑', '姐姐': '👩', '弟弟': '👦', '妹妹': '👧', '全家': '🏠',
  };
  const WHO_CHOICES = ['爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆', '哥哥', '姐姐', '弟弟', '妹妹', '宝贝'];

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
    });
  });

  // ---------- 🏠 共享大冰箱 ----------

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
    const foods = Store.get('foodList')
      .slice()
      .sort((a, b) => (a.expireDate < b.expireDate ? -1 : a.expireDate > b.expireDate ? 1 : 0));

    if (foods.length === 0) {
      $('food-list').innerHTML = '<p class="empty-text">冰箱空空的。去"我的家庭"把买到的食材入库吧。</p>';
      return;
    }

    $('food-list').innerHTML = foods
      .map((food) => {
        const remain = remainingInfo(food.expireDate);
        const badge = OWNER_AVATARS[food.owner] && food.owner !== '全家' ? OWNER_AVATARS[food.owner] : '';
        return `
          <div class="food-card">
            ${badge ? `<span class="member-badge">${badge}</span>` : ''}
            <div class="food-info">
              <div class="food-name">${escapeHtml(food.name)}</div>
              <div class="food-details">
                <span class="remaining-days ${remain.cls}">${remain.text}</span>
                <span class="added-by">[👤 ${escapeHtml(food.addedBy)}]</span>
              </div>
            </div>
            <button class="finish-button" data-id="${escapeHtml(food.id)}">吃光了</button>
          </div>`;
      })
      .join('');
  }

  // 点"吃光了"：先记下吃掉的营养，再从冰箱里移除
  $('food-list').addEventListener('click', (e) => {
    const button = e.target.closest('.finish-button');
    if (!button) return;
    const foodList = Store.get('foodList');
    const food = foodList.find((item) => item.id === button.dataset.id);
    if (!food) return;

    const nutrition = estimateNutrition(food.name);
    const record = {
      id: `eaten-${Date.now()}`,
      name: food.name,
      owner: food.owner || '全家',
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      known: nutrition.known,
      date: todayString(),
    };
    Store.set('eatenLog', Store.get('eatenLog').concat(record));
    Store.set('foodList', foodList.filter((item) => item.id !== food.id));

    showToast(
      record.known
        ? `吃光了！+${record.kcal} 千卡，蛋白质 ${record.protein} 克`
        : '已吃光（这个食材的营养还没收录）'
    );
  });

  // 拍照录入：目前只显示照片，识别食材以后再做
  $('photo-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const preview = $('photo-preview');
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    showToast('照片获取成功！');
  });

  // 剩菜盲盒
  $('open-blind-box').addEventListener('click', () => {
    $('recipe-modal').hidden = false;
  });
  $('close-modal').addEventListener('click', () => {
    $('recipe-modal').hidden = true;
  });

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
            ${Store.isCloud && m.id === Store.deviceId ? '<span class="me-tag">我</span>' : ''}
          </div>`
          )
          .join('')
      : '<p class="empty-text">还没有成员。</p>';

    const items = Store.get('shoppingList');
    if (items.length === 0) {
      $('shopping-list').innerHTML = '<p class="empty-text">待买清单是空的。</p>';
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

  // 添加待买食材
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

  // 确认买齐，反向入库：勾选的食材进冰箱，从待买清单移除
  $('confirm-purchase').addEventListener('click', () => {
    const items = Store.get('shoppingList');
    const bought = items.filter((item) => item.bought);
    if (bought.length === 0) {
      showToast('没有勾选任何已购买物品', 2000);
      return;
    }
    const newFoods = bought.map((item, i) => ({
      id: `${item.id}-${Date.now()}-${i}`,
      name: item.name,
      expireDate: Store.daysFromToday(7),
      addedBy: `${myName()}买入`,
      owner: '全家',
    }));
    Store.set('foodList', Store.get('foodList').concat(newFoods));
    Store.set('shoppingList', items.filter((item) => !item.bought));
    showToast(`${bought.map((item) => shortName(item.name)).join('、')}已入库！可前往"共享大冰箱"查看`, 2500);
  });

  // 邀请新成员：手机上弹出系统分享，电脑上复制链接
  $('invite-button').addEventListener('click', async () => {
    if (!Store.isCloud) {
      showToast('还没接入云端，现在邀请家人也看不到同一个冰箱', 2500);
      return;
    }
    const shareData = {
      title: '张家大冰箱',
      text: `📢 滴！这是我们家的专属冰箱 Family ID [${Store.familyId}]，快点进来一起管剩菜啦！`,
      url: Store.inviteUrl(),
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      showToast('邀请链接已复制，发给家人就行', 2000);
    } catch (err) {
      // 用户取消分享时不用提示
    }
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

    $('today-text').textContent = `${today} · 今天全家吃光的食物`;
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
        '<p class="empty-text">今天还没有吃光的食材。去"共享大冰箱"点"吃光了"，这里就会自动累加。</p>';
      return;
    }
    // 最新吃的排在最上面
    $('eaten-list').innerHTML = todayRecords
      .slice()
      .reverse()
      .map(
        (r) => `
          <div class="row">
            <span class="row-name">${escapeHtml(r.name)}</span>
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

  // ---------- 启动 ----------
  function renderAll() {
    renderFridge();
    renderFamily();
    renderNutrition();
  }

  // 任何数据变化都重新画一遍，三个页面始终同步
  Store.watch(renderAll);
  renderAll();

  // 云端模式：等云端数据到了，看看"我"是不是已经在家庭成员里，不在就请选称呼
  if (Store.isCloud) {
    $('sync-status').textContent = '☁️ 正在连接云端…';
    Store.ready.then((ok) => {
      $('sync-status').textContent = ok ? '☁️ 已和家人实时同步' : '⚠️ 云端连接失败，暂时只保存在本机';
      if (ok && !me()) $('who-modal').hidden = false;
    });
  }
})();
