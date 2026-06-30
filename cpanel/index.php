<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/layout.php';

$stats = db()->query("
  SELECT
    (SELECT COUNT(*) FROM politicians) politicians,
    (SELECT COUNT(*) FROM promises) promises,
    (SELECT COUNT(*) FROM promises WHERE status='delivered') delivered,
    (SELECT COUNT(*) FROM promises WHERE status='broken') broken,
    (SELECT COUNT(*) FROM users) users
")->fetch();

layout_head('Track every promise');
?>
<section class="bg-grid border-b border-zinc-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
    <span class="inline-flex items-center gap-2 px-3 py-1 text-xs uppercase tracking-wider font-medium text-zinc-600 border border-zinc-300 rounded-full bg-white">
      <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
      A community-built accountability ledger
    </span>
    <h1 class="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mt-6 leading-[1.05]">
      Track every promise.<br><span class="text-zinc-400">Hold every politician.</span>
    </h1>
    <p class="text-lg text-zinc-700 mt-6 max-w-2xl">
      A public, crowdsourced platform documenting what politicians say, what they do, and the gap in between. Promises, work, wealth growth — all on the record.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="<?= url('/feed.php') ?>" class="px-5 py-2.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Explore politicians →</a>
      <a href="<?= url('/new.php') ?>" class="px-5 py-2.5 border border-zinc-300 rounded-md hover:bg-zinc-50">Add a politician</a>
    </div>
  </div>
</section>

<section class="border-b border-zinc-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200">
    <?php foreach ([
      ['Politicians', $stats['politicians'], ''],
      ['Promises', $stats['promises'], ''],
      ['Delivered', $stats['delivered'], 'text-green-700'],
      ['Broken', $stats['broken'], 'text-red-700'],
    ] as [$l,$v,$c]): ?>
      <div class="bg-white p-6 md:p-8">
        <div class="text-zinc-500 text-xs uppercase tracking-wider"><?= e($l) ?></div>
        <div class="font-display font-bold text-4xl md:text-5xl mt-3 tabular-nums <?= $c ?>"><?= (int)$v ?></div>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
  <span class="text-xs uppercase tracking-wider font-medium text-zinc-500">What's tracked</span>
  <h2 class="font-display font-bold text-3xl sm:text-4xl tracking-tight mt-2">Everything that matters.</h2>
  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
    <?php foreach ([
      ['Profile', 'Country, state, city, constituency, party, position, photo, bio.'],
      ['Tenure', 'How long they have held the position, computed live.'],
      ['Promises', 'Every campaign promise with status: pending / in progress / delivered / broken.'],
      ['Wealth', 'Annual income and net worth entries over time, with sources.'],
    ] as [$t,$d]): ?>
      <div class="border border-zinc-200 rounded-md p-5 hover-lift">
        <h3 class="font-display font-semibold text-lg"><?= e($t) ?></h3>
        <p class="text-sm text-zinc-600 mt-1"><?= e($d) ?></p>
      </div>
    <?php endforeach; ?>
  </div>
</section>
<?php layout_foot();
