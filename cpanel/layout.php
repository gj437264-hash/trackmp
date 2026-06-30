<?php
// /app/cpanel/layout.php — header/footer rendering helpers
function layout_head(string $title = ''): void { ?>
<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title ? "$title · " . SITE_NAME : SITE_NAME) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; }
  .font-display { font-family: 'Cabinet Grotesk', 'Inter', sans-serif; letter-spacing: -0.02em; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .hover-lift { transition: transform .2s ease, border-color .2s ease; }
  .hover-lift:hover { transform: translateY(-2px); border-color: rgba(9,9,11,.4); }
  .bg-grid { background-image:
    linear-gradient(to right, rgba(0,0,0,.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,.04) 1px, transparent 1px);
    background-size: 32px 32px; }
</style>
</head><body class="bg-white text-zinc-950">
<header class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-6">
    <a href="<?= url('/') ?>" class="font-display font-bold text-lg">📜 <?= e(SITE_NAME) ?></a>
    <nav class="hidden md:flex items-center gap-6 text-sm">
      <a href="<?= url('/feed.php') ?>" class="text-zinc-700 hover:text-zinc-950">Politicians</a>
      <a href="<?= url('/new.php') ?>" class="text-zinc-700 hover:text-zinc-950">Add Politician</a>
      <?php if (user()): ?>
        <a href="<?= url('/me.php') ?>" class="text-zinc-700 hover:text-zinc-950">My contributions</a>
      <?php endif; ?>
    </nav>
    <div class="ml-auto flex items-center gap-2 text-sm">
      <?php if ($u = user()): ?>
        <span class="hidden sm:inline px-2 py-1 border border-zinc-200 rounded-md"><?= e($u['name']) ?></span>
        <a href="<?= url('/logout.php') ?>" class="px-3 py-1.5 hover:bg-zinc-100 rounded">Logout</a>
      <?php else: ?>
        <a href="<?= url('/login.php') ?>" class="px-3 py-1.5 hover:bg-zinc-100 rounded">Login</a>
        <a href="<?= url('/register.php') ?>" class="px-3 py-1.5 bg-zinc-900 text-white rounded hover:bg-zinc-800">Sign up</a>
      <?php endif; ?>
    </div>
  </div>
</header>
<?php if ($f = flash()): ?>
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
  <div class="px-4 py-3 border rounded-md <?= $f['type'] === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800' ?>">
    <?= e($f['msg']) ?>
  </div>
</div>
<?php endif; ?>
<main>
<?php }

function layout_foot(): void { ?>
</main>
<footer class="border-t border-zinc-200 mt-16 py-10">
  <div class="max-w-7xl mx-auto px-4 text-sm text-zinc-500 flex justify-between flex-wrap gap-2">
    <span class="font-display font-bold text-zinc-900"><?= e(SITE_NAME) ?></span>
    <span>A public accountability project.</span>
  </div>
</footer>
</body></html>
<?php }
