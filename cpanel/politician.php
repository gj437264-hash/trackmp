<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/layout.php';

$id = (int)($_GET['id'] ?? 0);
$user = user();

// ---- POST handlers ----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_login(); check_csrf();
    $action = $_POST['action'] ?? '';
    if ($action === 'add_promise') {
        $title = trim($_POST['title']); $desc = trim($_POST['description']);
        $status = in_array($_POST['status'] ?? '', ['pending','in_progress','delivered','broken'], true) ? $_POST['status'] : 'pending';
        $date = $_POST['date_made'] ?: null; $src = trim($_POST['source_url']) ?: null;
        if ($title !== '') {
            db()->prepare("INSERT INTO promises (politician_id, title, description, status, date_made, source_url, created_by) VALUES (?,?,?,?,?,?,?)")
                ->execute([$id, $title, $desc ?: null, $status, $date, $src, $user['id']]);
            flash('Promise logged.');
        }
    } elseif ($action === 'add_work') {
        $title = trim($_POST['title']); $desc = trim($_POST['description']);
        $date = $_POST['work_date'] ?: null; $src = trim($_POST['source_url']) ?: null;
        if ($title !== '') {
            db()->prepare("INSERT INTO works (politician_id, title, description, work_date, source_url, created_by) VALUES (?,?,?,?,?,?)")
                ->execute([$id, $title, $desc ?: null, $date, $src, $user['id']]);
            flash('Work added.');
        }
    } elseif ($action === 'add_wealth') {
        $asOf = $_POST['as_of_date']; $income = $_POST['annual_income'] === '' ? null : (float)$_POST['annual_income'];
        $nw = $_POST['net_worth'] === '' ? null : (float)$_POST['net_worth'];
        $src = trim($_POST['source_url']) ?: null; $notes = trim($_POST['notes']) ?: null;
        if ($asOf) {
            db()->prepare("INSERT INTO wealth_entries (politician_id, as_of_date, annual_income, net_worth, source_url, notes, created_by) VALUES (?,?,?,?,?,?,?)")
                ->execute([$id, $asOf, $income, $nw, $src, $notes, $user['id']]);
            flash('Wealth entry added.');
        }
    } elseif ($action === 'add_comment') {
        $body = trim($_POST['body']);
        if ($body !== '') {
            db()->prepare("INSERT INTO comments (politician_id, body, created_by) VALUES (?,?,?)")->execute([$id, $body, $user['id']]);
        }
    } elseif ($action === 'rate') {
        $score = max(1, min(5, (int)$_POST['score']));
        db()->prepare("REPLACE INTO ratings (politician_id, user_id, score) VALUES (?,?,?)")->execute([$id, $user['id'], $score]);
        flash('Rating saved.');
    } elseif ($action === 'update_status') {
        $pid = (int)$_POST['promise_id'];
        $status = in_array($_POST['status'], ['pending','in_progress','delivered','broken'], true) ? $_POST['status'] : 'pending';
        db()->prepare("UPDATE promises SET status = ? WHERE id = ?")->execute([$status, $pid]);
        flash('Status updated.');
    } elseif ($action === 'verify' && $user['role'] === 'admin') {
        $v = (int)$_POST['verified'];
        db()->prepare("UPDATE politicians SET verified = ? WHERE id = ?")->execute([$v, $id]);
        flash($v ? 'Verified.' : 'Verification removed.');
    } elseif ($action === 'delete_politician') {
        $pol = db()->prepare("SELECT created_by FROM politicians WHERE id=?"); $pol->execute([$id]); $pol = $pol->fetch();
        if ($pol && ($pol['created_by'] == $user['id'] || $user['role'] === 'admin')) {
            foreach (['promises','works','comments','ratings','wealth_entries'] as $t) db()->prepare("DELETE FROM $t WHERE politician_id = ?")->execute([$id]);
            db()->prepare("DELETE FROM politicians WHERE id = ?")->execute([$id]);
            flash('Deleted.');
            redirect('/feed.php');
        }
    }
    redirect('/politician.php?id=' . $id);
}

// ---- Load data ----
$s = db()->prepare("SELECT * FROM politicians WHERE id = ?"); $s->execute([$id]); $pol = $s->fetch();
if (!$pol) { http_response_code(404); die('Politician not found.'); }

$promises = db()->prepare("SELECT pr.*, u.name AS author FROM promises pr JOIN users u ON u.id = pr.created_by WHERE pr.politician_id = ? ORDER BY pr.created_at DESC");
$promises->execute([$id]); $promises = $promises->fetchAll();

$works = db()->prepare("SELECT w.*, u.name AS author FROM works w JOIN users u ON u.id = w.created_by WHERE w.politician_id = ? ORDER BY w.created_at DESC");
$works->execute([$id]); $works = $works->fetchAll();

$comments = db()->prepare("SELECT c.*, u.name AS author FROM comments c JOIN users u ON u.id = c.created_by WHERE c.politician_id = ? ORDER BY c.created_at DESC");
$comments->execute([$id]); $comments = $comments->fetchAll();

$wealth = db()->prepare("SELECT w.*, u.name AS author FROM wealth_entries w JOIN users u ON u.id = w.created_by WHERE w.politician_id = ? ORDER BY w.as_of_date ASC");
$wealth->execute([$id]); $wealth = $wealth->fetchAll();

$rating = db()->prepare("SELECT AVG(score) avg_, COUNT(*) cnt FROM ratings WHERE politician_id = ?"); $rating->execute([$id]); $rating = $rating->fetch();
$avg = (float)($rating['avg_'] ?? 0); $cnt = (int)$rating['cnt'];

$total = count($promises);
$delivered = count(array_filter($promises, fn($p) => $p['status'] === 'delivered'));
$broken = count(array_filter($promises, fn($p) => $p['status'] === 'broken'));
$progress = count(array_filter($promises, fn($p) => in_array($p['status'], ['in_progress','pending'], true)));
$dpct = $total ? round($delivered * 100 / $total) : 0;

// Wealth growth calculation
$firstW = $wealth[0] ?? null;
$lastW = $wealth ? end($wealth) : null;
$nwGrowth = ($firstW && $lastW && $firstW['net_worth'] !== null && $lastW['net_worth'] !== null && (float)$firstW['net_worth'] > 0)
    ? round((((float)$lastW['net_worth'] - (float)$firstW['net_worth']) / (float)$firstW['net_worth']) * 100, 1) : null;

$isAuthed = (bool)$user;
$isAdmin = $isAuthed && $user['role'] === 'admin';
$canEdit = $isAuthed && ($user['id'] == $pol['created_by'] || $isAdmin);

layout_head($pol['name']);
?>
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="border border-zinc-200 rounded-md p-6 sm:p-8 bg-white">
    <div class="flex flex-col sm:flex-row gap-6">
      <img src="<?= e($pol['photo_url'] ?: 'https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400') ?>" class="h-32 w-32 sm:h-40 sm:w-40 rounded-md object-cover border border-zinc-200 bg-zinc-100">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="font-display text-3xl sm:text-4xl font-bold tracking-tight"><?= e($pol['name']) ?></h1>
          <?php if ($pol['verified']): ?><span class="text-blue-600 text-xl" title="Verified by admin">✓</span><?php endif; ?>
        </div>
        <div class="flex items-center gap-2 flex-wrap mt-2 text-sm">
          <span class="px-2 py-0.5 border border-zinc-200 rounded bg-zinc-50"><?= e($pol['party']) ?></span>
          <span class="text-zinc-500">·</span>
          <span class="text-zinc-700"><?= e($pol['position']) ?></span>
          <span class="text-zinc-500">·</span>
          <span class="text-zinc-700">In position: <b><?= e(tenure($pol['position_since'])) ?></b><?= $pol['position_since'] ? ' (since ' . e($pol['position_since']) . ')' : '' ?></span>
        </div>
        <div class="text-sm text-zinc-600 mt-2">📍 <?= e(trim(($pol['city'] ? $pol['city'].', ' : '') . $pol['constituency'] . ', ' . $pol['state'] . ', ' . $pol['country'])) ?></div>
        <?php if ($pol['bio']): ?><p class="text-zinc-700 mt-4 leading-relaxed"><?= nl2br(e($pol['bio'])) ?></p><?php endif; ?>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <?php if ($canEdit): ?>
            <a class="px-3 py-1.5 border border-zinc-300 rounded-md text-sm hover:bg-zinc-50" href="<?= url('/new.php?id='.$id) ?>">Edit</a>
            <form method="post" class="inline" onsubmit="return confirm('Delete this politician and all related data?');">
              <input type="hidden" name="csrf" value="<?= e(csrf()) ?>">
              <input type="hidden" name="action" value="delete_politician">
              <button class="px-3 py-1.5 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50">Delete</button>
            </form>
          <?php endif; ?>
          <?php if ($isAdmin): ?>
            <form method="post" class="inline">
              <input type="hidden" name="csrf" value="<?= e(csrf()) ?>">
              <input type="hidden" name="action" value="verify">
              <input type="hidden" name="verified" value="<?= $pol['verified'] ? 0 : 1 ?>">
              <button class="px-3 py-1.5 rounded-md text-sm <?= $pol['verified'] ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-zinc-300 hover:bg-zinc-50' ?>">
                <?= $pol['verified'] ? 'Verified (remove)' : 'Verify' ?>
              </button>
            </form>
          <?php endif; ?>
          <button onclick="navigator.clipboard.writeText(window.location.href).then(()=>this.innerText='Copied!')" class="px-3 py-1.5 border border-zinc-300 rounded-md text-sm hover:bg-zinc-50">Share</button>
        </div>

        <!-- Public rating -->
        <div class="mt-4">
          <div class="flex items-center gap-2 text-sm text-zinc-600">
            <span class="text-amber-500 text-lg tabular-nums">
              <?php for ($i=1; $i<=5; $i++) echo $i <= round($avg) ? '★' : '☆'; ?>
            </span>
            <span class="tabular-nums font-medium"><?= $cnt ? number_format($avg, 2) : '—' ?></span>
            <span class="text-zinc-400">(<?= $cnt ?> ratings)</span>
          </div>
          <?php if ($isAuthed): ?>
            <form method="post" class="mt-2 flex items-center gap-1">
              <input type="hidden" name="csrf" value="<?= e(csrf()) ?>">
              <input type="hidden" name="action" value="rate">
              <?php for ($i=1; $i<=5; $i++): ?>
                <button name="score" value="<?= $i ?>" class="text-2xl text-zinc-300 hover:text-amber-400 transition-colors" title="Rate <?= $i ?>">★</button>
              <?php endfor; ?>
            </form>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- Stats strip -->
    <div class="mt-6 grid grid-cols-2 md:grid-cols-5 gap-px bg-zinc-200 border border-zinc-200 rounded-md overflow-hidden">
      <?php foreach ([
        ['Promises', $total, '', ''],
        ['Delivered', $delivered, $total ? "$dpct%" : '', 'text-green-700'],
        ['In progress / pending', $progress, '', 'text-amber-700'],
        ['Broken', $broken, '', 'text-red-700'],
        ['Current net worth', fmt_money($lastW && $lastW['net_worth'] !== null ? (float)$lastW['net_worth'] : null), $nwGrowth !== null ? ($nwGrowth >= 0 ? "+$nwGrowth%" : "$nwGrowth%") . ' growth' : '', $nwGrowth !== null && $nwGrowth < 0 ? 'text-red-700' : 'text-zinc-950'],
      ] as [$l,$v,$sub,$c]): ?>
        <div class="bg-white p-4">
          <div class="text-xs uppercase tracking-wider text-zinc-500"><?= e($l) ?></div>
          <div class="font-display font-bold text-2xl mt-1 tabular-nums <?= $c ?>"><?= is_int($v) ? $v : $v ?></div>
          <?php if ($sub): ?><div class="text-xs text-zinc-500 mt-0.5"><?= e($sub) ?></div><?php endif; ?>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- Tabs (simple, via URL hash) -->
  <div class="mt-8 border-b border-zinc-200 flex flex-wrap gap-1 text-sm">
    <?php foreach ([
      'promises' => 'Promises ('.$total.')',
      'wealth' => 'Wealth ('.count($wealth).')',
      'works' => 'Work ('.count($works).')',
      'discussion' => 'Discussion ('.count($comments).')',
    ] as $k => $l): ?>
      <a href="#<?= $k ?>" class="tab px-4 py-2 border-b-2 border-transparent hover:border-zinc-300" data-tab="<?= $k ?>"><?= e($l) ?></a>
    <?php endforeach; ?>
  </div>

  <!-- Promises -->
  <section id="promises" class="tab-panel mt-6 space-y-4">
    <?php if ($isAuthed): ?>
      <details class="border border-zinc-200 rounded-md bg-white p-4">
        <summary class="cursor-pointer text-zinc-700">+ Log a new promise</summary>
        <form method="post" class="mt-4 space-y-3 text-sm">
          <input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><input type="hidden" name="action" value="add_promise">
          <input name="title" required placeholder="Promise title *" class="w-full px-3 py-2 border border-zinc-300 rounded-md">
          <textarea name="description" rows="2" placeholder="Context / description" class="w-full px-3 py-2 border border-zinc-300 rounded-md"></textarea>
          <div class="grid sm:grid-cols-3 gap-3">
            <select name="status" class="px-3 py-2 border border-zinc-300 rounded-md bg-white">
              <option value="pending">Pending</option><option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option><option value="broken">Broken</option>
            </select>
            <input name="date_made" type="date" class="px-3 py-2 border border-zinc-300 rounded-md">
            <input name="source_url" type="url" placeholder="Source URL" class="px-3 py-2 border border-zinc-300 rounded-md">
          </div>
          <button class="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Add promise</button>
        </form>
      </details>
    <?php endif; ?>
    <?php foreach ($promises as $p): ?>
      <div class="border border-zinc-200 rounded-md p-5 bg-white">
        <div class="flex items-start gap-3 flex-wrap">
          <h4 class="font-display font-semibold flex-1"><?= e($p['title']) ?></h4>
          <?= status_badge($p['status']) ?>
        </div>
        <?php if ($p['description']): ?><p class="text-sm text-zinc-700 mt-2"><?= nl2br(e($p['description'])) ?></p><?php endif; ?>
        <div class="mt-3 text-xs text-zinc-500 flex flex-wrap items-center gap-3">
          <span>by <b class="text-zinc-700"><?= e($p['author']) ?></b></span>
          <?php if ($p['date_made']): ?><span>made: <?= e($p['date_made']) ?></span><?php endif; ?>
          <?php if ($p['source_url']): ?><a class="text-blue-600 underline" href="<?= e($p['source_url']) ?>" target="_blank" rel="noopener">source</a><?php endif; ?>
          <?php if ($isAuthed): ?>
            <form method="post" class="ml-auto inline-flex items-center gap-1">
              <input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><input type="hidden" name="action" value="update_status"><input type="hidden" name="promise_id" value="<?= (int)$p['id'] ?>">
              <select name="status" class="px-2 py-1 border border-zinc-300 rounded text-xs">
                <?php foreach (['pending'=>'Pending','in_progress'=>'In Progress','delivered'=>'Delivered','broken'=>'Broken'] as $k=>$l): ?>
                  <option value="<?= $k ?>" <?= $p['status'] === $k ? 'selected' : '' ?>><?= e($l) ?></option>
                <?php endforeach; ?>
              </select>
              <button class="px-2 py-1 border border-zinc-300 rounded text-xs hover:bg-zinc-50">Update</button>
            </form>
          <?php endif; ?>
        </div>
      </div>
    <?php endforeach; ?>
    <?php if (!$promises): ?><div class="text-center py-12 text-zinc-500 border border-dashed border-zinc-300 rounded-md">No promises logged yet.</div><?php endif; ?>
  </section>

  <!-- Wealth -->
  <section id="wealth" class="tab-panel mt-6 space-y-4 hidden">
    <?php if ($isAuthed): ?>
      <details class="border border-zinc-200 rounded-md bg-white p-4">
        <summary class="cursor-pointer text-zinc-700">+ Log income / net worth</summary>
        <form method="post" class="mt-4 space-y-3 text-sm">
          <input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><input type="hidden" name="action" value="add_wealth">
          <div class="grid sm:grid-cols-3 gap-3">
            <div><label class="text-zinc-600">As of date *</label><input name="as_of_date" type="date" required class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md"></div>
            <div><label class="text-zinc-600">Annual income (<?= e(CURRENCY_SYMBOL) ?>)</label><input name="annual_income" type="number" step="1" class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md"></div>
            <div><label class="text-zinc-600">Net worth (<?= e(CURRENCY_SYMBOL) ?>)</label><input name="net_worth" type="number" step="1" class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md"></div>
          </div>
          <input name="source_url" type="url" placeholder="Source URL (asset declaration etc.)" class="w-full px-3 py-2 border border-zinc-300 rounded-md">
          <textarea name="notes" rows="2" placeholder="Notes" class="w-full px-3 py-2 border border-zinc-300 rounded-md"></textarea>
          <button class="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Add entry</button>
        </form>
      </details>
    <?php endif; ?>
    <?php if ($wealth): ?>
      <div class="overflow-x-auto border border-zinc-200 rounded-md bg-white">
        <table class="w-full text-sm">
          <thead class="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs">
            <tr><th class="text-left px-4 py-3">As of</th><th class="text-right px-4 py-3">Annual income</th><th class="text-right px-4 py-3">Net worth</th><th class="text-left px-4 py-3">Source</th><th class="text-left px-4 py-3">By</th></tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <?php $prev = null; foreach ($wealth as $w):
              $growth = ($prev && $prev['net_worth'] !== null && $w['net_worth'] !== null && (float)$prev['net_worth'] > 0)
                ? round((((float)$w['net_worth'] - (float)$prev['net_worth']) / (float)$prev['net_worth']) * 100, 1) : null; ?>
              <tr class="hover:bg-zinc-50">
                <td class="px-4 py-3 tabular-nums"><?= e($w['as_of_date']) ?></td>
                <td class="px-4 py-3 text-right tabular-nums"><?= fmt_money($w['annual_income'] !== null ? (float)$w['annual_income'] : null) ?></td>
                <td class="px-4 py-3 text-right tabular-nums">
                  <?= fmt_money($w['net_worth'] !== null ? (float)$w['net_worth'] : null) ?>
                  <?php if ($growth !== null): ?>
                    <span class="ml-2 text-xs <?= $growth >= 0 ? 'text-green-700' : 'text-red-700' ?>"><?= ($growth >= 0 ? '+' : '') . $growth ?>%</span>
                  <?php endif; ?>
                </td>
                <td class="px-4 py-3"><?php if ($w['source_url']): ?><a class="text-blue-600 underline" href="<?= e($w['source_url']) ?>" target="_blank" rel="noopener">view</a><?php else: echo '—'; endif; ?></td>
                <td class="px-4 py-3 text-zinc-600"><?= e($w['author']) ?></td>
              </tr>
            <?php $prev = $w; endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php else: ?>
      <div class="text-center py-12 text-zinc-500 border border-dashed border-zinc-300 rounded-md">No wealth records yet.</div>
    <?php endif; ?>
  </section>

  <!-- Work -->
  <section id="works" class="tab-panel mt-6 space-y-4 hidden">
    <?php if ($isAuthed): ?>
      <details class="border border-zinc-200 rounded-md bg-white p-4">
        <summary class="cursor-pointer text-zinc-700">+ Log work / achievement</summary>
        <form method="post" class="mt-4 space-y-3 text-sm">
          <input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><input type="hidden" name="action" value="add_work">
          <input name="title" required placeholder="Title *" class="w-full px-3 py-2 border border-zinc-300 rounded-md">
          <textarea name="description" rows="2" placeholder="Description" class="w-full px-3 py-2 border border-zinc-300 rounded-md"></textarea>
          <div class="grid sm:grid-cols-2 gap-3">
            <input name="work_date" type="date" class="px-3 py-2 border border-zinc-300 rounded-md">
            <input name="source_url" type="url" placeholder="Source URL" class="px-3 py-2 border border-zinc-300 rounded-md">
          </div>
          <button class="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Add work</button>
        </form>
      </details>
    <?php endif; ?>
    <?php foreach ($works as $w): ?>
      <div class="border border-zinc-200 rounded-md p-5 bg-white">
        <h4 class="font-display font-semibold"><?= e($w['title']) ?></h4>
        <?php if ($w['description']): ?><p class="text-sm text-zinc-700 mt-2"><?= nl2br(e($w['description'])) ?></p><?php endif; ?>
        <div class="mt-2 text-xs text-zinc-500">by <b class="text-zinc-700"><?= e($w['author']) ?></b><?php if ($w['work_date']): ?> · <?= e($w['work_date']) ?><?php endif; ?> <?php if ($w['source_url']): ?>· <a class="text-blue-600 underline" target="_blank" rel="noopener" href="<?= e($w['source_url']) ?>">source</a><?php endif; ?></div>
      </div>
    <?php endforeach; ?>
    <?php if (!$works): ?><div class="text-center py-12 text-zinc-500 border border-dashed border-zinc-300 rounded-md">No work entries yet.</div><?php endif; ?>
  </section>

  <!-- Discussion -->
  <section id="discussion" class="tab-panel mt-6 space-y-4 hidden">
    <?php if ($isAuthed): ?>
      <form method="post" class="border border-zinc-200 rounded-md bg-white p-4">
        <input type="hidden" name="csrf" value="<?= e(csrf()) ?>"><input type="hidden" name="action" value="add_comment">
        <textarea name="body" rows="2" required placeholder="Share your perspective..." class="w-full px-3 py-2 border border-zinc-300 rounded-md"></textarea>
        <div class="flex justify-end mt-2"><button class="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Post</button></div>
      </form>
    <?php endif; ?>
    <?php foreach ($comments as $c): ?>
      <div class="border border-zinc-200 rounded-md p-4 bg-white">
        <div class="text-sm font-medium text-zinc-900"><?= e($c['author']) ?></div>
        <p class="text-sm text-zinc-700 mt-1 whitespace-pre-wrap"><?= e($c['body']) ?></p>
      </div>
    <?php endforeach; ?>
    <?php if (!$comments): ?><div class="text-center py-12 text-zinc-500 border border-dashed border-zinc-300 rounded-md">Start the discussion.</div><?php endif; ?>
  </section>
</div>

<script>
  function showTab(name) {
    document.querySelectorAll('.tab-panel').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(name) || document.getElementById('promises');
    target.classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('border-zinc-900','text-zinc-950','font-semibold'));
    const active = document.querySelector(`.tab[data-tab="${target.id}"]`);
    if (active) active.classList.add('border-zinc-900','text-zinc-950','font-semibold');
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', e => { setTimeout(() => showTab(location.hash.slice(1) || 'promises'), 0); }));
  showTab(location.hash.slice(1) || 'promises');
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1) || 'promises'));
</script>
<?php layout_foot();
