<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/layout.php';

$q = trim($_GET['q'] ?? '');
$country = $_GET['country'] ?? '';
$state = $_GET['state'] ?? '';
$city = $_GET['city'] ?? '';
$constituency = $_GET['constituency'] ?? '';
$party = $_GET['party'] ?? '';
$position = $_GET['position'] ?? '';
$sort = $_GET['sort'] ?? 'recent';

$where = [];
$params = [];
if ($q !== '') {
    $where[] = "(p.name LIKE ? OR p.constituency LIKE ? OR p.party LIKE ? OR p.position LIKE ?)";
    array_push($params, "%$q%","%$q%","%$q%","%$q%");
}
foreach (['country','state','city','constituency','party','position'] as $col) {
    if ($$col !== '') { $where[] = "p.$col = ?"; $params[] = $$col; }
}
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$orderMap = [
    'recent' => 'p.created_at DESC',
    'name' => 'p.name ASC',
    'tenure_long' => 'p.position_since ASC',
    'tenure_short' => 'p.position_since DESC',
    'rating' => 'rating_avg DESC, rating_count DESC',
    'delivered' => 'delivered_count DESC',
    'promises' => 'promises_count DESC',
    'wealth' => 'latest_net_worth DESC',
];
$order = $orderMap[$sort] ?? $orderMap['recent'];

$sql = "
SELECT p.*,
  (SELECT COUNT(*) FROM promises WHERE politician_id = p.id) promises_count,
  (SELECT COUNT(*) FROM promises WHERE politician_id = p.id AND status='delivered') delivered_count,
  (SELECT COUNT(*) FROM promises WHERE politician_id = p.id AND status='broken') broken_count,
  COALESCE((SELECT AVG(score) FROM ratings WHERE politician_id = p.id), 0) rating_avg,
  (SELECT COUNT(*) FROM ratings WHERE politician_id = p.id) rating_count,
  (SELECT net_worth FROM wealth_entries WHERE politician_id = p.id ORDER BY as_of_date DESC LIMIT 1) latest_net_worth
FROM politicians p
$whereSql
ORDER BY $order
LIMIT 200";
$stmt = db()->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Distinct filter values from DB
$dist = function(string $col): array {
    $r = db()->query("SELECT DISTINCT $col v FROM politicians WHERE $col <> '' ORDER BY $col")->fetchAll(PDO::FETCH_COLUMN);
    return $r;
};
$countries = $dist('country'); $states = $dist('state'); $cities = $dist('city'); $parties = $dist('party'); $positions = $dist('position');

layout_head('Politicians');
?>
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
  <div class="flex items-end justify-between flex-wrap gap-4 mb-8">
    <div>
      <span class="text-xs uppercase tracking-wider font-medium text-zinc-500">The ledger</span>
      <h1 class="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-1">Politicians</h1>
    </div>
    <a href="<?= url('/new.php') ?>" class="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">+ Add politician</a>
  </div>

  <form method="get" class="border border-zinc-200 rounded-md bg-white p-4 grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8 text-sm">
    <input name="q" value="<?= e($q) ?>" placeholder="Search name, party..." class="md:col-span-2 px-3 py-2 border border-zinc-300 rounded-md">
    <?php foreach ([
      ['country', $countries, 'Country'],
      ['state', $states, 'State'],
      ['city', $cities, 'City'],
      ['party', $parties, 'Party'],
      ['position', $positions, 'Position'],
    ] as [$name, $opts, $label]): ?>
      <select name="<?= $name ?>" class="px-3 py-2 border border-zinc-300 rounded-md bg-white">
        <option value="">All <?= e(strtolower($label)) ?></option>
        <?php foreach ($opts as $o): ?>
          <option value="<?= e($o) ?>" <?= $$name === $o ? 'selected' : '' ?>><?= e($o) ?></option>
        <?php endforeach; ?>
      </select>
    <?php endforeach; ?>
    <input name="constituency" value="<?= e($constituency) ?>" placeholder="Constituency" class="px-3 py-2 border border-zinc-300 rounded-md">
    <select name="sort" class="px-3 py-2 border border-zinc-300 rounded-md bg-white">
      <?php foreach ([
        'recent' => 'Recently added',
        'name' => 'Name (A-Z)',
        'tenure_long' => 'Longest in position',
        'tenure_short' => 'Newest in position',
        'rating' => 'Highest public rating',
        'delivered' => 'Most delivered',
        'promises' => 'Most promises',
        'wealth' => 'Highest net worth',
      ] as $k => $l): ?>
        <option value="<?= $k ?>" <?= $sort === $k ? 'selected' : '' ?>><?= e($l) ?></option>
      <?php endforeach; ?>
    </select>
    <button class="px-4 py-2 border border-zinc-300 rounded-md hover:bg-zinc-50">Apply</button>
  </form>

  <?php if (!$rows): ?>
    <div class="text-center py-16 border border-dashed border-zinc-300 rounded-md text-zinc-600">No politicians found yet. <a class="text-blue-600 underline" href="<?= url('/new.php') ?>">Add the first one →</a></div>
  <?php else: ?>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <?php foreach ($rows as $r): $total = (int)$r['promises_count']; $dpct = $total ? round($r['delivered_count']*100/$total) : 0; ?>
        <a href="<?= url('/politician.php?id=' . $r['id']) ?>" class="block border border-zinc-200 rounded-md p-5 bg-white hover-lift">
          <div class="flex gap-4 items-start">
            <img src="<?= e($r['photo_url'] ?: 'https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200') ?>" class="h-16 w-16 rounded-md object-cover border border-zinc-200 bg-zinc-100" onerror="this.src='https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200'">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-display font-bold text-lg truncate"><?= e($r['name']) ?></h3>
                <?php if ($r['verified']): ?><span title="Verified" class="text-blue-600">✓</span><?php endif; ?>
              </div>
              <div class="text-sm text-zinc-600 mt-0.5"><span class="px-1.5 py-0.5 text-xs border border-zinc-200 rounded bg-zinc-50"><?= e($r['party']) ?></span> · <?= e($r['position']) ?></div>
              <div class="text-sm text-zinc-500 mt-1">📍 <?= e(trim(($r['city'] ? $r['city'].', ' : '') . $r['constituency'] . ', ' . $r['state'] . ', ' . $r['country'])) ?></div>
              <div class="text-xs text-zinc-500 mt-1">In position: <span class="text-zinc-700 font-medium"><?= e(tenure($r['position_since'])) ?></span></div>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-4 gap-2 text-center border-t border-zinc-100 pt-4 text-xs">
            <div><div class="uppercase tracking-wider text-zinc-500">Promises</div><div class="font-display font-bold text-lg tabular-nums"><?= $total ?></div></div>
            <div><div class="uppercase tracking-wider text-zinc-500">Delivered</div><div class="font-display font-bold text-lg tabular-nums text-green-700"><?= $dpct ?>%</div></div>
            <div><div class="uppercase tracking-wider text-zinc-500">Rating</div><div class="font-display font-bold text-lg tabular-nums">⭐ <?= number_format((float)$r['rating_avg'], 1) ?></div></div>
            <div><div class="uppercase tracking-wider text-zinc-500">Net worth</div><div class="font-display font-bold text-lg tabular-nums"><?= fmt_money($r['latest_net_worth'] !== null ? (float)$r['latest_net_worth'] : null) ?></div></div>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>
<?php layout_foot();
