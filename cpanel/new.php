<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/layout.php';

$user = user();
$id = (int)($_GET['id'] ?? 0);
$editing = isset($_GET['id']) && $id > 0;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_login();
    check_csrf();
    $fields = ['name','party','position','position_since','country','state','city','constituency','photo_url','bio'];
    $vals = [];
    foreach ($fields as $f) { $vals[$f] = trim($_POST[$f] ?? ''); }
    foreach (['name','party','position','country','state','constituency'] as $req) {
        if ($vals[$req] === '') { flash("$req is required", 'error'); redirect('/new.php' . ($editing ? "?id=$id" : '')); }
    }
    if ($vals['position_since'] === '') $vals['position_since'] = null;

    if ($editing) {
        $pol = db()->prepare("SELECT * FROM politicians WHERE id = ?"); $pol->execute([$id]); $pol = $pol->fetch();
        if (!$pol) { http_response_code(404); die('Not found'); }
        if ($pol['created_by'] != $user['id'] && $user['role'] !== 'admin') { http_response_code(403); die('Forbidden'); }
        $sql = "UPDATE politicians SET name=?, party=?, position=?, position_since=?, country=?, state=?, city=?, constituency=?, photo_url=?, bio=? WHERE id=?";
        db()->prepare($sql)->execute([$vals['name'],$vals['party'],$vals['position'],$vals['position_since'],$vals['country'],$vals['state'],$vals['city'],$vals['constituency'],$vals['photo_url'] ?: null,$vals['bio'] ?: null, $id]);
        flash('Updated.');
        redirect('/politician.php?id=' . $id);
    } else {
        $sql = "INSERT INTO politicians (name, party, position, position_since, country, state, city, constituency, photo_url, bio, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
        db()->prepare($sql)->execute([$vals['name'],$vals['party'],$vals['position'],$vals['position_since'],$vals['country'],$vals['state'],$vals['city'],$vals['constituency'],$vals['photo_url'] ?: null,$vals['bio'] ?: null, $user['id']]);
        $newId = (int)db()->lastInsertId();
        flash('Politician added.');
        redirect('/politician.php?id=' . $newId);
    }
}

require_login();

$pol = ['name'=>'','party'=>'','position'=>'','position_since'=>'','country'=>'','state'=>'','city'=>'','constituency'=>'','photo_url'=>'','bio'=>''];
if ($editing) {
    $s = db()->prepare("SELECT * FROM politicians WHERE id = ?"); $s->execute([$id]); $pol = $s->fetch();
    if (!$pol) { http_response_code(404); die('Not found'); }
}
layout_head($editing ? 'Edit politician' : 'Add a politician');
?>
<div class="max-w-2xl mx-auto px-4 py-10">
  <span class="text-xs uppercase tracking-wider font-medium text-zinc-500"><?= $editing ? 'Edit' : 'Contribute' ?></span>
  <h1 class="font-display text-4xl font-bold tracking-tight mt-1"><?= $editing ? 'Edit politician' : 'Add a politician' ?></h1>
  <form method="post" class="mt-8 space-y-4 border border-zinc-200 rounded-md p-6 bg-white">
    <input type="hidden" name="csrf" value="<?= e(csrf()) ?>">
    <div class="grid sm:grid-cols-2 gap-4 text-sm">
      <?php
      $field = function($name, $label, $required=false, $type='text') use ($pol) { ?>
        <div<?= str_contains($name, 'bio') || str_contains($name, 'photo') ? ' class="sm:col-span-2"' : '' ?>>
          <label class="font-medium"><?= e($label) ?><?= $required ? ' *' : '' ?></label>
          <?php if ($type === 'textarea'): ?>
            <textarea name="<?= e($name) ?>" rows="4" class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md"><?= e($pol[$name] ?? '') ?></textarea>
          <?php else: ?>
            <input name="<?= e($name) ?>" type="<?= e($type) ?>" <?= $required ? 'required' : '' ?> value="<?= e((string)($pol[$name] ?? '')) ?>" class="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md">
          <?php endif; ?>
        </div>
      <?php };
      $field('name','Full name', true);
      $field('party','Party', true);
      $field('position','Position', true);
      $field('position_since','In position since', false, 'date');
      $field('country','Country', true);
      $field('state','State / Province', true);
      $field('city','City');
      $field('constituency','Constituency', true);
      $field('photo_url','Photo URL', false, 'url');
      $field('bio','Short bio', false, 'textarea');
      ?>
    </div>
    <div class="flex justify-end gap-2 pt-2">
      <a href="<?= url($editing ? '/politician.php?id='.$id : '/feed.php') ?>" class="px-4 py-2 border border-zinc-300 rounded-md hover:bg-zinc-50">Cancel</a>
      <button class="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800"><?= $editing ? 'Save changes' : 'Add politician' ?></button>
    </div>
  </form>
</div>
<?php layout_foot();
