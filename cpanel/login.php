<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/layout.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $email = strtolower(trim($_POST['email'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    $stmt = db()->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if ($u && password_verify($password, $u['password_hash'])) {
        unset($u['password_hash']);
        $_SESSION['user'] = $u;
        $next = $_GET['next'] ?? '/feed.php';
        redirect($next);
    }
    $error = 'Invalid email or password.';
}
layout_head('Log in');
?>
<div class="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-zinc-50">
  <div class="w-full max-w-md bg-white border border-zinc-200 rounded-md p-8">
    <h1 class="font-display text-3xl font-bold">Welcome back</h1>
    <p class="text-zinc-600 mt-1 text-sm">Log in to contribute to the ledger.</p>
    <form method="post" class="mt-6 space-y-4">
      <input type="hidden" name="csrf" value="<?= e(csrf()) ?>">
      <div>
        <label class="text-sm font-medium">Email</label>
        <input name="email" type="email" required class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none">
      </div>
      <div>
        <label class="text-sm font-medium">Password</label>
        <input name="password" type="password" required class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none">
      </div>
      <?php if ($error): ?>
        <div class="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded"><?= e($error) ?></div>
      <?php endif; ?>
      <button class="w-full px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Sign in</button>
    </form>
    <p class="text-sm text-center mt-6 text-zinc-600">New here? <a class="text-blue-600 underline" href="<?= url('/register.php') ?>">Create an account</a></p>
  </div>
</div>
<?php layout_foot();
