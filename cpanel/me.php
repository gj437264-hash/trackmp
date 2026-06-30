<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/layout.php';
$u = require_login();
$pols = db()->prepare("SELECT * FROM politicians WHERE created_by = ? ORDER BY created_at DESC"); $pols->execute([$u['id']]); $pols = $pols->fetchAll();
$proms = db()->prepare("SELECT pr.*, p.name pol_name FROM promises pr JOIN politicians p ON p.id = pr.politician_id WHERE pr.created_by = ? ORDER BY pr.created_at DESC"); $proms->execute([$u['id']]); $proms = $proms->fetchAll();
$wks = db()->prepare("SELECT w.*, p.name pol_name FROM works w JOIN politicians p ON p.id = w.politician_id WHERE w.created_by = ? ORDER BY w.created_at DESC"); $wks->execute([$u['id']]); $wks = $wks->fetchAll();
$weal = db()->prepare("SELECT w.*, p.name pol_name FROM wealth_entries w JOIN politicians p ON p.id = w.politician_id WHERE w.created_by = ? ORDER BY w.created_at DESC"); $weal->execute([$u['id']]); $weal = $weal->fetchAll();

layout_head('My contributions');
?>
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <span class="text-xs uppercase tracking-wider font-medium text-zinc-500">Your record</span>
  <h1 class="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-1">My contributions</h1>

  <?php foreach ([
    ['Politicians', $pols, fn($r) => '<a class="text-zinc-900 font-medium" href="'.url('/politician.php?id='.$r['id']).'">'.e($r['name']).'</a> <span class="text-zinc-500">— '.e($r['party']).' · '.e($r['constituency']).', '.e($r['state']).'</span>'],
    ['Promises', $proms, fn($r) => '<a class="text-zinc-900 font-medium" href="'.url('/politician.php?id='.$r['politician_id']).'#promises">'.e($r['title']).'</a> <span class="text-zinc-500">— for '.e($r['pol_name']).'</span> '.status_badge($r['status'])],
    ['Wealth entries', $weal, fn($r) => '<a class="text-zinc-900 font-medium" href="'.url('/politician.php?id='.$r['politician_id']).'#wealth">'.e($r['as_of_date']).'</a> <span class="text-zinc-500">— '.e($r['pol_name']).' · Net worth '.fmt_money($r['net_worth'] !== null ? (float)$r['net_worth'] : null).'</span>'],
    ['Work entries', $wks, fn($r) => '<a class="text-zinc-900 font-medium" href="'.url('/politician.php?id='.$r['politician_id']).'#works">'.e($r['title']).'</a> <span class="text-zinc-500">— '.e($r['pol_name']).'</span>'],
  ] as [$label, $rows, $render]): ?>
    <section class="mt-8">
      <h2 class="font-display text-xl font-semibold mb-3"><?= e($label) ?> <span class="text-zinc-400 tabular-nums">(<?= count($rows) ?>)</span></h2>
      <?php if (!$rows): ?>
        <div class="text-zinc-500 border border-dashed border-zinc-300 rounded-md p-6 text-center text-sm">Nothing here yet.</div>
      <?php else: ?>
        <div class="border border-zinc-200 rounded-md bg-white divide-y divide-zinc-100">
          <?php foreach ($rows as $r): ?>
            <div class="px-4 py-3 text-sm"><?= $render($r) ?></div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </section>
  <?php endforeach; ?>
</div>
<?php layout_foot();
