<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/layout.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $email = strtolower(trim($_POST['email'] ?? ''));
    $name = trim($_POST['name'] ?? '');
    $password = (string)($_POST['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $error = 'Invalid email.';
    elseif (strlen($password) < 6) $error = 'Password must be at least 6 characters.';
    elseif ($name === '') $error = 'Please provide a name.';
    else {
        try {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            db()->prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
                ->execute([$email, $name, $hash]);
            $id = (int)db()->lastInsertId();
            $_SESSION['user'] = ['id' => $id, 'email' => $email, 'name' => $name, 'role' => 'user'];
            redirect('/feed.php');
        } catch (PDOException $e) {
            $error = (str_contains($e->getMessage(), 'Duplicate')) ? 'Email already registered.' : 'Could not register.';
        }
    }
}
layout_head('Sign up');
?>
<div class="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-zinc-50">
  <div class="w-full max-w-md bg-white border border-zinc-200 rounded-md p-8">
    <h1 class="font-display text-3xl font-bold">Create your account</h1>
    <form method="post" class="mt-6 space-y-4">
      <input type="hidden" name="csrf" value="<?= e(csrf()) ?>">
      <div><label class="text-sm font-medium">Display name</label>
        <input name="name" required class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md"></div>
      <div><label class="text-sm font-medium">Email</label>
        <input name="email" type="email" required class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md"></div>
      <div><label class="text-sm font-medium">Password (min 6 chars)</label>
        <input name="password" type="password" minlength="6" required class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md"></div>
      <?php if ($error): ?><div class="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded"><?= e($error) ?></div><?php endif; ?>
      <button class="w-full px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Create account</button>
    </form>
    <p class="text-sm text-center mt-6 text-zinc-600">Already have an account? <a class="text-blue-600 underline" href="<?= url('/login.php') ?>">Log in</a></p>
  </div>
</div>
<?php layout_foot();
