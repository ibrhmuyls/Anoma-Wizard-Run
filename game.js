
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('start-overlay');

const groundImage = new Image();
groundImage.src = 'assets/ground.png';

const snowyGroundImage = new Image();
snowyGroundImage.src = 'assets/ground_snowy.png';

const groundTransitionDuration = 12000; // 8 saniyelik geçiş
const fitcoinImage = new Image();
fitcoinImage.src = 'assets/fitcoin.png';

const wizardHatImage = new Image();
wizardHatImage.src = 'assets/wizard_hat.png';

const bubbleImage = new Image();
bubbleImage.src = 'assets/bubble.png';

const shrimpImage = new Image();
shrimpImage.src = 'assets/shrimp.png';  // Görselini bu dosyaya koymayı unutma!

const arrowImage = new Image();
arrowImage.src = 'assets/arrow.png';

const pendulumImage = new Image();
pendulumImage.src = 'assets/pendulum.png';  // Buz sarkaçı görselinin yolu

const diamondColors = [
  'blue', 'brown', 'green', 'orange', 'pink', 'purple', 'red', 'turquoise', 'white', 'yellow'
];
const diamondImages = {};
for (const color of diamondColors) {
  const img = new Image();
  img.src = `assets/${color}_diamond.png`;
  diamondImages[color] = img;
}

const loseOverlay     = document.getElementById('lose-overlay');
const loseRestartBtn  = document.getElementById('lose-restart-btn');
const loseCoinsText   = document.getElementById('lose-coins');
const losePointsText  = document.getElementById('lose-points');

let currentGround = groundImage;  // Başlangıç zemini
let groundTransitionProgress = 0; // 0'dan 1'e gider
let groundTransitionStartTime = null;

let healEffects = [];
const shrimps = [];  // Aktif karideslerin listesi
const obstacles = [];
const clouds = [];
let lastShrimpSpawnTime = 0;
const shrimpSpawnInterval = 60000; // 60 saniye

// 1. cloudFrames'i oluştur

const cloudFrames = [];
const cloudFrameNames = [
  'cloud_red', 'cloud_red_2',
  'cloud_white', 'cloud_white_2',
  'cloud_black', 'cloud_black_2'
];

for (const name of cloudFrameNames) {
  const img = new Image();
  img.src = `assets/${name}.png`;
  cloudFrames.push(img);
}

// 2. Sonra cloudAnimation’ı oluştur (çünkü artık cloudFrames hazır)
const cloudAnimation = {
  frameIndex: 0,
  frameCount: cloudFrames.length,
  frameDuration: 150,
  lastFrameTime: 0
};
let snowIntensity = 0;   // 0 = hiç kar yok, 1 = maksimum kar yağışı
const maxSnowflakes = 35;  // maksimum kar tanesi sayısı
const snowflakes = [];
const stars = [];
const diamonds = [];
let lastRedSpawnTime = 0;
const redSpawnCooldown = 15000; // 15 saniye bekleme
let jumpKeyHeld = false;
let gameStarted = false;
let gameOver = false;
let isBoosted = false;
let boostEndTime = 0;
let lastGroundTime = 0;
let gameStartTime = null;
let isInvincible = false;
let invincibleEndTime = 0;
let lives = 3;  // Başlangıçta 3 can hakkı
const maxLives = 3;   // Maksimum can sayısı
let isRespawning = false;  // Can yenilenirken yanıp sönme durumu
let respawnTime = 0;       // Yenilenme süresi için zaman damgası
const respawnDuration = 3000; // 3 saniye yanıp sönme süresi
const frameCount = 44;
const frames = [];
let currentFrame = 0;
const fps = 12;
const frameDuration = 1000 / fps;
let lastFrameTime = 0;
let isDying = false;  // ← Bu satırı ekleyin
let groundX = 0;
let isJumping = false;
let jumpStartTime = 0;
const maxJumpTime = 550;  // Zıplama süresi artırıldı
let isNight = false;
let isSnow = false;
let nightProgress = 0; // 0 = gündüz, 1 = gece
let dyingStartTime = 0;  // Ölme animasyonu başladığında atanacak
const dyingDuration = 1000; // Animasyon toplam süresi (ms), 1 saniye örnek
const character = {
  x: 80,
  y: 0,
  width: 0,
  height: 0,
  vy: 0,
  gravity: 0.6,      // Daha yumuşak düşüş
  jumpForce: 20,     // Daha güçlü zıplama
  onGround: false,
  scale: 0.3,
};

let bubbleActive = false;
let bubbleEndTime = 0;
const bubbleRadius = 200;
let lastBubbleSpawnTime = 0;       // en başa, global

const bubbleSpawnCooldown = 20000; // 20 saniye bekleme süresi

const OBSTACLE_DELAY_AFTER_START = 10000;    // 10 saniye
const OBSTACLE_DELAY_AFTER_RESPAWN = 10000;  // 10 saniye

const groundY = canvas.height * 0.75;
const groundY2 = canvas.height * 0.80;
const platforms = [];

let obstacleSpeed = 8;
const fitcoinSpeed = () => (isBoosted ? obstacleSpeed * 1.25 : obstacleSpeed);
const obstacleMinGap = 120;
const obstacleMaxGap = 250;
let lastObstacleX = canvas.width;

const fitcoinSize = 90 * 0.3;
const fitcoins = [];
let collectedFitcoins = 0;
const fitcoinsToWin = 1000;

const items = [];
let totalPoints = 0;
// Oyuncuya gösterilecek geçici yazılar için
let floatingTexts = [];

// Ortada gösterilen büyük mesaj
let centerMessage = null;

// Floating text ekleme fonksiyonu
function addFloatingText(text, x, y) {
  floatingTexts.push({
    text,
    x,
    y,
    opacity: 1,
    lifespan: 60
  });
}


function showCenterMessage(title, subtitle, duration = 120) {
  centerMessage = {
    title,
    subtitle,
    opacity: 1,
    timer: duration
  };
}

function allImagesLoaded() {
  const arrowReady = arrowImage.complete && arrowImage.naturalWidth > 0;
  const fitcoinReady = fitcoinImage.complete && fitcoinImage.naturalWidth > 0;
  const hatReady = wizardHatImage.complete && wizardHatImage.naturalWidth > 0;
  const diamondsReady = Object.values(diamondImages).every(img => img.complete && img.naturalWidth > 0);
  const framesReady = frames.every(img => img.complete && img.naturalWidth > 0);
  return arrowReady && fitcoinReady && hatReady && diamondsReady && framesReady;
}


for (let i = 1; i <= frameCount; i++) {
  const img = new Image();
  const num = i.toString().padStart(3, '0');
  img.src = `frame-${num}.png`;
  frames.push(img);
}

function jumpStart() {
  const now = performance.now();
  const timeSinceGround = now - lastGroundTime;

  if ((character.onGround || timeSinceGround < 150)) {
    isJumping = true;
    jumpStartTime = now;
    character.vy = -character.jumpForce;
    character.onGround = false;
  }
}
function jumpEnd() {
  // Eğer tuş bırakıldıysa ve hala yukarı hız varsa onu kısalt
  if (character.vy < -8) {
    character.vy = -8;  // Daha yüksek zıplama için burada sınır koyabilirsin
  }
  isJumping = false;
}

function spawnShrimp() {
  const y = Math.random() * (groundY2 - 100);  // Yerde bir yerde çıksın
  shrimps.push({
    x: canvas.width + 100,
    y: y,
    width: 40,
    height: 40
  });
}
function updateShrimps() {
  for (let i = shrimps.length - 1; i >= 0; i--) {
    shrimps[i].x -= fitcoinSpeed();  // Aynı hızla gelsin

    // Ekran dışına çıktıysa sil
    if (shrimps[i].x + shrimps[i].width < 0) {
      shrimps.splice(i, 1);
      continue;
    }

    // Karakterle çarpıştıysa
    if (
      character.x < shrimps[i].x + shrimps[i].width &&
      character.x + character.width > shrimps[i].x &&
      character.y < shrimps[i].y + shrimps[i].height &&
      character.y + character.height > shrimps[i].y
    ) {
      shrimps.splice(i, 1);

      // CAN ARTIR! lives değişkeniyle, maxLives varsa sınırla
      lives = Math.min(lives + 1, maxLives ?? Infinity);

      floatingTexts.push({
        text: '+1 HP (Shrimp)',
        x: character.x,
        y: character.y - 20,
        alpha: 1
      });

      // 🎉 Kalp ve +1 görsel efekti oluştur
      healEffects.push({
        x: character.x + character.width / 2,
        y: character.y - 20,
        text: '+1',
        alpha: 1,
        rotation: 0,
        size: 20,
      });
    }
  }
}
function updateHealEffects() {
  for (let i = healEffects.length - 1; i >= 0; i--) {
    const e = healEffects[i];
    e.y -= 0.5;             // Yukarı çıkar
    e.alpha -= 0.01;        // Saydamlaşır
    e.rotation += 0.05;     // Döner
    e.size += 0.2;          // Büyür biraz

    if (e.alpha <= 0) {
      healEffects.splice(i, 1);  // Tamamen kaybolduysa sil
    }
  }
}
function drawHealEffects() {
  for (const e of healEffects) {
    ctx.save();
    ctx.globalAlpha = e.alpha;
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rotation);
    ctx.fillStyle = 'red';
    ctx.font = `${e.size}px Arial`;
    ctx.fillText('❤️ +1', 0, 0);
    ctx.restore();
  }
}


function updatePlatforms() {
  for (let i = platforms.length - 1; i >= 0; i--) {
    platforms[i].x -= fitcoinSpeed();
    if (platforms[i].x + platforms[i].width < 0) {
      platforms.splice(i, 1);
    }
  }

  // Belirli aralıklarla yeni platform çıkart
  if (platforms.length < 1 && Math.random() < 0.005) {
    spawnPlatformWithDiamonds();
  }
}

function spawnDiamondsWithoutPlatform() {
  const startX = canvas.width + Math.random() * 300; // Ekranın sağından rastgele başlangıç
  const diamondCount = 10;  // Sabit 10 elmas
  const spacing = 40;       // Elmaslar arasındaki yatay mesafe

  const baseY = 150;  // Zeminin üstü, elmas yüksekliği 40 olduğu için biraz yukarda

  for (let i = 0; i < diamondCount; i++) {
    // Rastgele renk seçimi
    const color = diamondColors[Math.floor(Math.random() * diamondColors.length)];

    diamonds.push({
      x: startX + i * spacing,
      y: baseY,
      width: 40,
      height: 40,
      color: color,
      value: 100
    });
  }
}


function updateDiamonds() {
  const speed = fitcoinSpeed();
  for (let i = diamonds.length - 1; i >= 0; i--) {
    diamonds[i].x -= speed;

    // Ekran dışına çıktıysa sil
    if (diamonds[i].x + diamonds[i].width < 0) {
      diamonds.splice(i, 1);
      continue;
    }

    if (bubbleActive) {
      const dx = (character.x + character.width / 2) - (diamonds[i].x + diamonds[i].width / 2);
      const dy = (character.y + character.height / 2) - (diamonds[i].y + diamonds[i].height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Daha büyük mesafe sınırı (örneğin 400px)
      if (distance < 400 && distance > 5) {
        // Mesafeye göre çekme kuvveti, uzak olan az, yakın olan fazla
        const maxPull = 25;   // maksimum çekme hızı
        const pullStrength = maxPull * (1 - distance / 400);  // mesafe arttıkça kuvvet azalır
        diamonds[i].x += (dx / distance) * pullStrength;
        diamonds[i].y += (dy / distance) * pullStrength;
      }
    }
  }
}


function checkDiamondCollision() {
  const charBox = {
    x: character.x,
    y: character.y,
    width: character.width,
    height: character.height,
  };

  for (let i = diamonds.length - 1; i >= 0; i--) {
    const d = diamonds[i];
    const diamondBox = {
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
    };

    if (isColliding(charBox, diamondBox)) {
      diamonds.splice(i, 1);
      totalPoints += d.value;   // 100 puan ekle
      addFloatingText("+100 Points", character.x + character.width / 2, character.y);
    }
  }
}


function spawnObstacle(type) {
  const x = canvas.width + 450;
  let y;

  if (type === 'arrow') {
    const minY = 80;
    const maxY = groundY2 - 120;
    y = Math.random() * (maxY - minY) + minY;

    obstacles.push({
      type, x, y, width: 70, height: 20,
      rotation: 0,
      rotationSpeed: 0.2,
      speed: 14
    });
  }
}

function checkObstacleCollision() {
  const charBox = {
    x: character.x + character.width * 0.2,
    y: character.y + character.height * 0.1,
    width: character.width * 0.6,
    height: character.height * 0.8,
  };

  if (isInvincible || isRespawning) return; // yenilenirken ve invincible iken etkilenme

  for (const obs of obstacles) {
    const obsBox = {
      x: obs.x + obs.width * 0.1,
      y: obs.y + obs.height * 0.1,
      width: obs.width * 0.8,
      height: obs.height * 0.8,
    };

    if (isColliding(charBox, obsBox)) {
      lives--;  // Canı azalt

      if (lives > 0) {
        // Ölme animasyonu başlat
        isDying = true;
        character.vy = 10;      // Aşağı doğru hız
        character.onGround = false;
      } else {
        // Oyun bitti: “kaybettin” overlay’ini göster
        gameOver = true;
        showLoseOverlay();
      }

      return;  // Çarpışma sonrası döngüden çık
    }
  }
}



function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];

    // BOOST ETKİSİ VARSA ENGEL HIZINI ARTIR
    const actualSpeed = isBoosted ? obs.speed * 1.5 : obs.speed;
    obs.x -= actualSpeed;


    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }
}



// 2. drawObstacles fonksiyonunda değişiklik:
function drawObstacles() {
  for (const obs of obstacles) {
    if (obs.type === 'arrow') {
      ctx.save();
      ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
      ctx.rotate(obs.rotation);

      // Kar var mı kontrolü
      if (isSnow) {
        // Kar varsa buz sarkaçı görseli çiz
        if (pendulumImage.complete && pendulumImage.naturalWidth !== 0) {
          ctx.drawImage(pendulumImage, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
        }
      } else {
        // Kar yoksa normal ok görseli
        if (arrowImage.complete && arrowImage.naturalWidth !== 0) {
          ctx.drawImage(arrowImage, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
        }
      }

      ctx.restore();
    }
  }
}


function spawnRandomObstacle() {
  const now = performance.now();

  // 10 saniyelik engel yasağı kontrolü (oyun başı ve dirilme sonrası)
  if (
    (gameStartTime && now - gameStartTime < 10000) ||
    (respawnTime && now - respawnTime < 10000)
  ) {
    return;
  }

  // Eğer hali hazırda ekranda engel varsa yeni spawn etme
  if (obstacles.length > 0) return;
  
  const lastObs = obstacles.length > 0 ? obstacles[obstacles.length - 1] : null;
  
  if (lastObs && lastObs.x > canvas.width - obstacleMinGap) {
    return;
  }
  
  if (Math.random() < 0.005) {  // Sıklık azaltıldı
    const type = 'arrow';
    spawnObstacle(type);
  }
}


function createItem(type, x, y) {
  let size = 40;
  let value = 100;

  if (type === 'red') {
    size *= 1.3;
    value = 1000;
  }

  const item = {
    type,
    x,
    y,
    width: size,
    height: size,
    value,
  };

  // 🌟 Sadece bubble'lara özel alanlar
  if (type === 'bubble') {
    item.baseY = y;
    item.floatOffset = Math.random() * 1000;
  }

  return item;
}

function checkGround() {
  character.onGround = false;
  const charBottom = character.y + character.height;

  // Öncelikle bulutlarla çarpışma kontrolü
  for (const c of clouds) {
    const screenX = c.baseX + groundX;
    const withinX = character.x + character.width > screenX && character.x < screenX + c.width;

    if (
      character.vy >= 0 &&
      charBottom >= c.y - 5 &&
      charBottom <= c.y + character.vy + 5 &&
      withinX
    ) {
      character.y = c.y - character.height;
      character.vy = 0;
      character.onGround = true;
      isJumping = false;
      lastGroundTime = performance.now();
      if (jumpKeyHeld) jumpStart();
      return;
    }
  }

  // Sadece yere inme kontrolü kaldı
  if (charBottom >= groundY2) {
    character.y = groundY2 - character.height;
    character.vy = 0;
    character.onGround = true;
    isJumping = false;
    lastGroundTime = performance.now();
    if (jumpKeyHeld) jumpStart();
  }
}

function isColliding(r1, r2) {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

function spawnFitcoin() {
  const minGap = 300;
  const mostRightFitcoin = fitcoins.reduce((max, f) => f.x > max ? f.x : max, 0);
  if (mostRightFitcoin > canvas.width - minGap) return;

  if (Math.random() < 0.15) {
    const patternWeights = [0, 0, 1, 2, 3, 0, 1, 2, 4, 5]; // 5 eklendi
    const patternType = patternWeights[Math.floor(Math.random() * patternWeights.length)];
    const startX = canvas.width + 50;

    if ((patternType === 3 || patternType === 4) && Math.random() < 0.5) return;

    if (patternType === 0) {
      const count = 2 + Math.floor(Math.random() * 5);
      const gap = 50;
      const startY = groundY2 - 120;
      for (let i = 0; i < count; i++) {
        const x = startX + i * gap;
        if (!isOnPlatform(x)) {
          fitcoins.push({ x, y: startY });
        }
      }
    }

    else if (patternType === 1) {
      const count = 3 + Math.floor(Math.random() * 4);
      const radius = 60;
      const centerY = 160 + Math.random() * 60;
      const startAngle = Math.PI;
      const angleStep = Math.PI / (count - 1);
      for (let i = 0; i < count; i++) {
        const angle = startAngle - i * angleStep;
        const x = startX + i * 50;
        const y = centerY - Math.sin(angle) * radius;
        if (!isOnPlatform(x)) {
          fitcoins.push({ x, y });
        }
      }
    }

    else if (patternType === 2) {
      const count = 1 + Math.floor(Math.random() * 3);
      const gap = 50;
      const baseY = groundY2 - 100;
      for (let i = 0; i < count; i++) {
        const y = baseY - i * gap;
        const x = startX;
        if (!isOnPlatform(x)) {
          fitcoins.push({ x, y });
        }
      }
    }

    else if (patternType === 3) {
      const count = 2 + Math.floor(Math.random() * 3);
      const gap = 50;
      const y = 200 + Math.random() * 40;
      for (let i = 0; i < count; i++) {
        const x = startX + i * gap;
        if (!isOnPlatform(x)) {
          fitcoins.push({ x, y });
        }
      }
    }

    else if (patternType === 4) {
      const count = 3 + Math.floor(Math.random() * 4);
      const radius = 60;
      const centerY = 210 + Math.random() * 40;
      const startAngle = Math.PI;
      const angleStep = Math.PI / (count - 1);
      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * angleStep;
        const x = startX + i * 50;
        const y = centerY + Math.sin(angle) * radius;
        if (!isOnPlatform(x)) {
          fitcoins.push({ x, y });
        }
      }
    }

    else if (patternType === 5) {
      const count = 25;
      const gap = 40;
      const startY = groundY2 - 100;
      for (let i = 0; i < count; i++) {
        const x = startX + i * gap;
        const y = startY;
        if (!isOnPlatform(x)) {
          fitcoins.push({ x, y });
        }
      }
    }
  }
}

function isOnPlatform(x) {
  for (const p of platforms) {
    if (x >= p.x && x <= p.x + p.width) {
      return true; // x platformun üzerinde
    }
  }
  return false;
}
function updateFitcoins() {
  for (let i = fitcoins.length - 1; i >= 0; i--) {
    fitcoins[i].x -= fitcoinSpeed();

    // Ekranın dışına çıktıysa sil
    if (fitcoins[i].x + fitcoinSize < 0) {
      fitcoins.splice(i, 1);
      continue;  // Silindikten sonra devam etme
    }

    if (bubbleActive) {
      // Karakter ve fitcoin merkezleri
      const dx = (character.x + character.width / 2) - (fitcoins[i].x + fitcoinSize / 2);
      const dy = (character.y + character.height / 2) - (fitcoins[i].y + fitcoinSize / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const bubbleRadius = 400; // Çekim etkisi yarıçapı
      const minDistance = 5;    // Çok yakınsa çekme yapma (ani sıçrama önleme)

      if (distance < bubbleRadius && distance > minDistance) {
        const maxPull = 25; // Maksimum çekme hızı
        // Mesafeye göre kuvvet azalır
        const pullStrength = maxPull * Math.pow(1 - distance / bubbleRadius, 0.5);

        // Fitcoini karaktere doğru hareket ettir
        fitcoins[i].x += (dx / distance) * pullStrength;
        fitcoins[i].y += (dy / distance) * pullStrength;
      }
    }
  }

  spawnFitcoin();
}

function drawFitcoins() {
  for (const f of fitcoins) {
    if (fitcoinImage.complete && fitcoinImage.naturalWidth !== 0) {
      ctx.drawImage(fitcoinImage, f.x, f.y, fitcoinSize, fitcoinSize);
    }
  }
}
function checkFitcoinCollision() {
  const charBox = {
    x: character.x,
    y: character.y,
    width: character.width,
    height: character.height,
  };

  for (let i = fitcoins.length - 1; i >= 0; i--) {
    const coin = fitcoins[i];
    const coinBox = {
      x: coin.x,
      y: coin.y,
      width: fitcoinSize,
      height: fitcoinSize,
    };
    const platformUnderCoin = platforms.find(p =>
      coin.x + fitcoinSize / 2 >= p.x &&
      coin.x + fitcoinSize / 2 <= p.x + p.width &&
      Math.abs(coin.y + fitcoinSize - p.y) < 5
    );
    // İşte buradaki if eksikti:
    if (
      charBox.x < coinBox.x + coinBox.width &&
      charBox.x + charBox.width > coinBox.x &&
      charBox.y < coinBox.y + coinBox.height &&
      charBox.y + charBox.height > coinBox.y
    ) {
      // Karakterle çarpıştıysa
      fitcoins.splice(i, 1);
      collectedFitcoins++;
      addFloatingText("+1 COIN", character.x + character.width / 2, character.y);
    }
  }
}

function spawnItem() {
  if (items.length > 5) return;

  const now = performance.now();
  const redDiamondExists = items.some(item => item.type === 'red');

  if (!redDiamondExists && now - lastRedSpawnTime > redSpawnCooldown && Math.random() < 0.001) {
    const x = canvas.width + Math.random() * 100;
    const y = Math.random() * (groundY2 - 80 - 40) + 80;
    items.push(createItem('red', x, y));
    lastRedSpawnTime = now;
  }

  // Diğer renkli elmaslar için ayrı spawn şansı
  if (Math.random() < 0.001) {  // %1 ihtimal, kırmızıdan daha sık
    const filteredColors = diamondColors.filter(c => c !== 'red');
    const type = filteredColors[Math.floor(Math.random() * filteredColors.length)];
    const x = canvas.width + Math.random() * 100;
    const y = Math.random() * (groundY2 - 80 - 40) + 80;
    items.push(createItem(type, x, y));
  }

  // Şapka spawnı aynı kalabilir
  if (Math.random() < 0.001) {
    const x = canvas.width + 50 + Math.random() * 100;
    const y = groundY2 - 50;
    items.push({ type: 'hat', x, y, width: 50, height: 50 });
  }
  // Bubble zaten varsa veya cooldown dolmamışsa çıkma
  const bubbleExists = items.some(item => item.type === 'bubble');

  if (!bubbleExists && now - lastBubbleSpawnTime > bubbleSpawnCooldown && Math.random() < 0.005) {
    const x = canvas.width + 100 + Math.random() * 300;
    const y = Math.random() * (groundY2 - 120 - 40) + 80;
    items.push(createItem('bubble', x, y));
    lastBubbleSpawnTime = now;  // cooldown başlat
  }
  // --- YENİ: 10'lu sabit dizili elmas spawn ---
  if (items.length <= 2 && Math.random() < 0.005) {  // Çok düşük ihtimal
    const diamondCount = 10;
    const spacing = 50; // Elmaslar arası mesafe
    const baseX = canvas.width + 100; // Başlangıç X konumu (ekranın sağında)
    const baseY = groundY2 - 520; // Yükseklik (yerden biraz yukarı)
    
    const filteredColors = diamondColors.filter(c => c !== 'red');  // kırmızı hariç

    for (let i = 0; i < diamondCount; i++) {
      const color = filteredColors[Math.floor(Math.random() * filteredColors.length)];
      const x = baseX + i * spacing;
      const y = baseY;
      items.push(createItem(color, x, y));
    }
  }
}


function updateItems() {
  for (let i = items.length - 1; i >= 0; i--) {
    // Şapkanın y'sini yere sabitle (groundY2 - height)
    if (items[i].type === 'hat') {
      items[i].y = groundY2 - items[i].height; 
      items[i].x -= fitcoinSpeed();
    } else {
      items[i].x -= fitcoinSpeed();
    }
// Eğer bubble ise, hafif salınım yap
if (items[i].type === 'bubble') {
  const t = performance.now() / 1000; // Zamanı saniye cinsinden al
  items[i].y = items[i].baseY + Math.sin(t * 2 + items[i].floatOffset) * 16; // Yukarı-aşağı 8px salınım
}
// Bubble mı aktif, çekim etkisi uygula
if (bubbleActive && items[i].type !== 'hat' && items[i].type !== 'bubble') {
  const dx = (character.x + character.width/2) - (items[i].x + items[i].width/2);
  const dy = (character.y + character.height/2) - (items[i].y + items[i].height/2);
  const distance = Math.sqrt(dx*dx + dy*dy);
  const bubbleRadius = 400;  // Çekim yarıçapı, artırabilirsin
  const minDistance = 5; // Çok yakınsa çekme

  if (distance < bubbleRadius && distance > minDistance) {
    const maxPull = 25; 
    const pullStrength = maxPull * (1 - distance / bubbleRadius);

    items[i].x += (dx / distance) * pullStrength;
    items[i].y += (dy / distance) * pullStrength;
  }
}

    if (items[i].x + items[i].width < 0) {
      items.splice(i, 1);
    }
  }

  spawnItem();
}


function checkItemCollision() {
  const charBox = {
    x: character.x,
    y: character.y,
    width: character.width,
    height: character.height,
  };

  for (let i = items.length - 1; i >= 0; i--) {
    if (isColliding(charBox, items[i])) {
      const item = items.splice(i, 1)[0];

      if (item.type === 'hat') {
        isBoosted = true;
        boostEndTime = performance.now() + 20000;
        showCenterMessage("Wizard Hat!", "Speed Boost Activated!");
      } else if (item.type === 'red') {
        isInvincible = true;
        invincibleEndTime = performance.now() + 15000;  // 15 saniye yenilmezlik
        showCenterMessage("Red Diamond!", "Invincibility Activated!");
      } else if (item.type === 'bubble') {
        bubbleActive = true;
        bubbleEndTime = performance.now() + 10000; // 10 saniye sürsün
        showCenterMessage("Bubble!", "Magnetic Collection Activated!");
      } else {
        totalPoints += item.value;
        addFloatingText(`+${item.value} POINTS`, character.x + character.width / 2, character.y);
      }
    }
  }
}

function createClouds() {
  clouds.length = 0;
  clouds.push({ baseX: 300, y: groundY - 150, width: 100, height: 60 });
  clouds.push({ baseX: 600, y: groundY - 200, width: 120, height: 70 });
  clouds.push({ baseX: 900, y: groundY - 180, width: 100, height: 60 });
}

function spawnCloud() {
  const baseX = groundX + canvas.width + 100;  // Dünya koordinatı olarak ayarla
  const y = groundY - 200 - Math.random() * 200;
  clouds.push({ baseX, y, width: 100, height: 60 });
}

function updateClouds(timestamp) {
  if (timestamp - cloudAnimation.lastFrameTime > cloudAnimation.frameDuration) {
    cloudAnimation.frameIndex = (cloudAnimation.frameIndex + 1) % cloudAnimation.frameCount;
    cloudAnimation.lastFrameTime = timestamp;
  }
}
function drawClouds() {
  const frame = cloudFrames[cloudAnimation.frameIndex];
  for (const c of clouds) {
    // Dünya kaymasıyla birlikte ekranda nerede olacağı
    const screenX = c.baseX + groundX;

    // Ekran dışındaysa atla (performans)
    if (screenX + c.width < 0 || screenX > canvas.width) continue;

    ctx.save();
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(performance.now() / 300);
    ctx.drawImage(frame, screenX, c.y, c.width, c.height);
    ctx.restore();
  }
}

function drawItems() {
  for (const item of items) {
    if (item.type === 'hat') {
      if (wizardHatImage.complete)
        ctx.drawImage(wizardHatImage, item.x, item.y, item.width, item.height);

    } else if (item.type === 'bubble') {
      if (bubbleImage.complete)
        ctx.drawImage(bubbleImage, item.x, item.y, item.width, item.height);

    } else {
      const img = diamondImages[item.type];
      if (img && img.complete)
        ctx.drawImage(img, item.x, item.y, item.width, item.height);
    }
  }
}



// Panel stil sabitleri
const HUD = {
  x: 10,
  y: 10,
  width: 260,
  height: 140,
  borderRadius: 12,
};

// Yuvarlak köşeli dikdörtgen çizen fonksiyon
function roundRect(ctx, x, y, width, height, radius = 5, fill = true, stroke = true) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  }

  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawFancyHeart(ctx, x, y, baseSize, filled) {
  ctx.save();

  const size = baseSize * 3; // 3 kat büyük
  const topCurveHeight = size * 0.35;

  ctx.translate(x, y);

  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.9);

  ctx.bezierCurveTo(
    size * 0.95, size * 0.6,
    size * 1.15, topCurveHeight,
    size * 0.5, topCurveHeight
  );
  ctx.bezierCurveTo(
    size * -0.15, topCurveHeight,
    size * 0.05, size * 0.6,
    size * 0.5, size * 0.9
  );

  if (filled) {
    const gradient = ctx.createRadialGradient(
      size * 0.5, size * 0.5, size * 0.1,
      size * 0.5, size * 0.5, size * 0.6
    );
    gradient.addColorStop(0, '#ffe6e6');
    gradient.addColorStop(0.3, '#ff4d4d');
    gradient.addColorStop(0.7, '#cc0000');
    gradient.addColorStop(1, '#660000');

    ctx.fillStyle = gradient;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fill();

    // Yansıma efektleri
    ctx.beginPath();
    ctx.ellipse(size * 0.58, size * 0.38, size * 0.14, size * 0.1, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(size * 0.45, size * 0.7, size * 0.1, size * 0.06, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
  } else {
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ff4d4d';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.stroke();
  }

  ctx.restore();
}


// Puan paneli çizimi
function drawPointCounter() {
  ctx.save();

  const barHeight = 60;
  const padding = 30;

  // Arka plan barı (cam efekti, biraz daha yumuşak gradient ve hafif hareket)
  const time = performance.now() / 1000;
  const gradient = ctx.createLinearGradient(0, 0, 0, barHeight);
  const baseAlphaTop = 0.85 + 0.05 * Math.sin(time * 2);
  const baseAlphaBottom = 0.3 + 0.1 * Math.cos(time * 1.5);
  gradient.addColorStop(0, `rgba(25, 25, 25, ${baseAlphaTop.toFixed(2)})`);
  gradient.addColorStop(1, `rgba(25, 25, 25, ${baseAlphaBottom.toFixed(2)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, barHeight);

  // Alt kenar çizgisi
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, barHeight);
  ctx.lineTo(canvas.width, barHeight);
  ctx.stroke();

  // Kalpler (Lives) - hafif nabız animasyonu ile
  const heartBaseSize = 12;
  const heartVisualSize = heartBaseSize * 3;
  const spacing = heartVisualSize + 10;

  for (let i = 0; i < 3; i++) {
    const x = padding + i * spacing;
    const y = (barHeight - heartVisualSize) / 2;

    // Nabız efekti için hafif büyütme/küçültme (dolu kalpler için)
    let scale = 1;
    if (i < lives) {
      scale = 1 + 0.08 * Math.sin(time * 8 + i); // küçük nabız efektleri farklı fazda
    }

    ctx.save();
    ctx.translate(x + heartVisualSize / 2, y + heartVisualSize / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + heartVisualSize / 2), -(y + heartVisualSize / 2));
    drawFancyHeart(ctx, x, y, heartBaseSize, i < lives);
    ctx.restore();
  }

  // Yazı: Puan - hafif parlaklık ve gölge efektiyle
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px Orbitron, sans-serif';
  ctx.textAlign = 'center';

  const glowAlpha = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(224, 224, 224, ${glowAlpha.toFixed(2)})`;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
  ctx.shadowBlur = 8;
  ctx.fillText(`POINTS: ${totalPoints}`, canvas.width / 2, barHeight / 2);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Yazı: Fitcoin - gradient ve parlaklık efekti ile
  ctx.textAlign = 'right';
  const coinGradient = ctx.createLinearGradient(canvas.width - 100, 0, canvas.width, 0);
  coinGradient.addColorStop(0, '#ffe57f');
  coinGradient.addColorStop(1, '#ffd700');
  ctx.fillStyle = coinGradient;
  ctx.fillText(`FITCOINS: ${collectedFitcoins}`, canvas.width - padding, barHeight / 2);

  // Efekt Yazıları (animasyonlu opacity ve hafif gölgeyle)
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px Orbitron, sans-serif';
  let effectY = barHeight + 24;

  const pulseAlpha = 0.5 + 0.5 * Math.sin(time * 6);

  ctx.shadowColor = 'darkred';
  ctx.shadowBlur = 20;

  // 🛡️ INVINCIBLE
  if (isInvincible) {
    ctx.fillStyle = `rgba(200, 50, 50, ${pulseAlpha.toFixed(2)})`;
    ctx.fillText(`🛡️ INVINCIBLE: ${getRemainingSeconds(invincibleEndTime)}s`, padding, effectY);
    effectY += 26;
  }

  // ⚡ BOOST
  if (isBoosted) {
    ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha.toFixed(2)})`;
    ctx.fillText(`⚡ BOOST: ${getRemainingSeconds(boostEndTime)}s`, padding, effectY);
    effectY += 26;
  }

  // 🫧 BUBBLE
  if (bubbleActive) {
    ctx.fillStyle = `rgba(0, 200, 255, ${pulseAlpha.toFixed(2)})`; // cyan-blue arası
    ctx.fillText(`🫧 BUBBLE: ${getRemainingSeconds(bubbleEndTime)}s`, padding, effectY);
    effectY += 26;
  }

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  ctx.restore();
}

// Kalan süreyi saniye olarak döner
function getRemainingSeconds(endTime) {
  return Math.max(0, Math.ceil((endTime - performance.now()) / 1000));
}


function drawDiamondGlow(ctx, x, y, width, height, time) {
  // Geçersiz değerleri kontrol et, çizim yapma
  if (
    typeof x !== 'number' || !isFinite(x) ||
    typeof y !== 'number' || !isFinite(y) ||
    typeof width !== 'number' || !isFinite(width) ||
    typeof height !== 'number' || !isFinite(height)
  ) {
    return;  // Hatalıysa çizim yok
  }

  const glowRadius = Math.max(width, height) * 0.8;
  if (glowRadius <= 0 || !isFinite(glowRadius)) return;

  // Radial gradient oluştur
  const gradient = ctx.createRadialGradient(
    x + width / 2, y + height / 2, 0,
    x + width / 2, y + height / 2, glowRadius
  );

  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.6 + 0.4 * Math.sin(time)})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  // Parlama için şekil çiz (elmas şeklinde)
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y);
  ctx.lineTo(x + width, y + height / 2);
  ctx.lineTo(x + width / 2, y + height);
  ctx.lineTo(x, y + height / 2);
  ctx.closePath();
  ctx.fill();

  // Parlak noktalar (sparkle)
  const sparkleCount = 5;
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (i / sparkleCount) * Math.PI * 2 + time;
    const sparkleX = x + width / 2 + Math.cos(angle) * width / 3;
    const sparkleY = y + height / 2 + Math.sin(angle) * height / 3;
    const sparkleRadius = 2 + Math.abs(Math.sin(time * 5 + i)) * 2;

    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, sparkleRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + 0.3 * Math.sin(time * 3 + i)})`;
    ctx.fill();
  }
}


function update(timestamp) {
  if (!gameStarted || gameOver) return;
  if (!allImagesLoaded()) return;

  if (gameStartTime === null) {
    gameStartTime = timestamp;
    groundTransitionProgress = 0;  // garanti olsun
    return;  // ilk frame çizimini atla, böylece sorun olmaz
  }

  // Ölme animasyonu: karakter düşerken dünya durmasın
  if (isDying) {
    if (dyingStartTime === 0) dyingStartTime = performance.now();

    const elapsed = performance.now() - dyingStartTime;

    character.vy += character.gravity * 0.2;
    character.y += character.vy;

    if (character.y >= groundY2 - character.height) {
      character.y = groundY2 - character.height;

      if (elapsed >= dyingDuration) {
        isDying = false;
        isRespawning = true;
        respawnTime = performance.now();
        character.x = 80;
        character.vy = 0;
        dyingStartTime = 0;
      }
    }
    
    return;
  }

  if (isRespawning) {
    if (performance.now() - respawnTime >= respawnDuration) {
      isRespawning = false;
    }
  }

  const speed = fitcoinSpeed();
  groundX -= speed;
  if (groundX <= -canvas.width) groundX = 0;

  if (timestamp - lastFrameTime > frameDuration) {
    currentFrame = (currentFrame + 1) % frameCount;
    lastFrameTime = timestamp;
  }

  const cycleTime = 150000;
  const timeSinceStart = timestamp - gameStartTime;
  const cyclePosition = timeSinceStart % cycleTime;

  if (cyclePosition < 30000) {
    groundTransitionProgress = 0;
    nightProgress = 0;
    snowIntensity = 0;
  } else if (cyclePosition < 40000) {
    groundTransitionProgress = (cyclePosition - 30000) / 10000;
    nightProgress = 0;
    snowIntensity = (cyclePosition - 30000) / 10000;
  } else if (cyclePosition < 70000) {
    groundTransitionProgress = 1;
    nightProgress = 0;
    snowIntensity = 1;
  } else if (cyclePosition < 110000) {
    groundTransitionProgress = 1;
    let t = (cyclePosition - 70000) / 40000;
    nightProgress = Math.min(1, Math.max(0, t));
    snowIntensity = 1;
  } else if (cyclePosition < 120000) {
    groundTransitionProgress = 1 - ((cyclePosition - 110000) / 10000);
    nightProgress = 1;
    snowIntensity = 1 - ((cyclePosition - 110000) / 10000);
  } else if (cyclePosition < 140000) {
    groundTransitionProgress = 0;
    nightProgress = 1;
    snowIntensity = 0;
  } else {
    groundTransitionProgress = 0;
    let t = (cyclePosition - 140000) / 10000;
    nightProgress = 1 - Math.min(1, Math.max(0, t));
    snowIntensity = 0;
  }

  // ---- BURASI GÜNCELLENDİ ----
  const now = performance.now();
  if (now - lastShrimpSpawnTime > shrimpSpawnInterval) {
    spawnShrimp();
    lastShrimpSpawnTime = now;
  }
  // ----------------------------

  isSnow = snowIntensity > 0;

  if (isInvincible && performance.now() > invincibleEndTime) {
    isInvincible = false;
  }

  if (isJumping) {
    const elapsed = performance.now() - jumpStartTime;
    if (elapsed >= maxJumpTime) {
      isJumping = false;
    }
  }

  if (!character.onGround) {
    character.vy += character.gravity;
  }

  character.y += character.vy;

  checkGround();

  updateItems();
  checkItemCollision();
  updateFitcoins();
  checkFitcoinCollision();
  updateDiamonds();
  checkDiamondCollision();
  updateShrimps();
  spawnRandomObstacle();
  updateObstacles();
  checkObstacleCollision();
  updateClouds(timestamp);
  updateHealEffects();
  floatingTexts.forEach(t => {
    t.y -= 0.5;
    t.opacity -= 1 / t.lifespan;
  });
  floatingTexts = floatingTexts.filter(t => t.opacity > 0);

  if (centerMessage) {
    centerMessage.timer--;
    if (centerMessage.timer < 30) {
      centerMessage.opacity = centerMessage.timer / 30;
    }
    if (centerMessage.timer <= 0) {
      centerMessage = null;
    }
  }

  if (isBoosted && performance.now() > boostEndTime) {
    isBoosted = false;
  }

  if (bubbleActive && performance.now() > bubbleEndTime) {
    bubbleActive = false;
  }

if (collectedFitcoins >= fitcoinsToWin) {
  gameOver = true;
  showWinOverlay(collectedFitcoins, totalPoints);
  return;
}

}


function createSnowflakes() {
  snowflakes.length = 0;
  for (let i = 0; i < maxSnowflakes; i++) {
    snowflakes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      speedY: Math.random() * 0.5 + 0.2
    });
  }
}

function drawSnowEffect() {
  const flakesToDraw = Math.floor(maxSnowflakes * snowIntensity);

  ctx.fillStyle = `rgba(255, 255, 255, ${snowIntensity})`; // Opaklığı da snowIntensity ile orantılı yapabiliriz

  ctx.beginPath();
  for (let i = 0; i < flakesToDraw; i++) {
    const flake = snowflakes[i];
    ctx.moveTo(flake.x, flake.y);
    ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
  }
  ctx.fill();

  for (let i = 0; i < flakesToDraw; i++) {
    const flake = snowflakes[i];
    flake.y += flake.speedY;
    if (flake.y > canvas.height) {
      flake.y = 0;
      flake.x = Math.random() * canvas.width;
    }
  }
}
function drawMoon() {
  const moonX = canvas.width - 100;
  const moonY = 80;
  const moonRadius = 30;

  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2, false);
  ctx.fillStyle = '#fdf6b2'; // Sarımsı açık renk
  ctx.fill();

  // Küçük bir gölge efekti (yarım ay görünümü)
  ctx.beginPath();
  ctx.arc(moonX + 10, moonY - 5, moonRadius, 0, Math.PI * 2, false);
  ctx.fillStyle = isSnow ? '#0a0a2a' : '#87ceeb'; // Geceye göre zemin
  ctx.fill();
}
function createStars(count = 50) {
  stars.length = 0;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      size: Math.random() * 2,
      alpha: Math.random()
    });
  }
}

function drawStars() {
  for (const star of stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
}
function drawBackground() {
  // Gece ve gündüz renkleri için RGB nesneleri
  const dayColor = { r: 135, g: 206, b: 235 }; // açık gökyüzü mavi (gündüz)
  const nightColor = { r: 10, g: 10, b: 42 };  // koyu gece mavisi (gece)

  // Renk karıştırma fonksiyonu
  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  // nightProgress: 0 (gündüz) - 1 (gece)
  const r = lerp(dayColor.r, nightColor.r, nightProgress);
  const g = lerp(dayColor.g, nightColor.g, nightProgress);
  const b = lerp(dayColor.b, nightColor.b, nightProgress);

  // Arka plan rengini ayarla
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Zemin çizimi
  if (groundTransitionProgress === 0) {
    ctx.drawImage(groundImage, groundX, groundY2, canvas.width, canvas.height - groundY2);
    ctx.drawImage(groundImage, groundX + canvas.width, groundY2, canvas.width, canvas.height - groundY2);
  } else if (groundTransitionProgress === 1) {
    ctx.drawImage(snowyGroundImage, groundX, groundY2, canvas.width, canvas.height - groundY2);
    ctx.drawImage(snowyGroundImage, groundX + canvas.width, groundY2, canvas.width, canvas.height - groundY2);
  } else {
    ctx.globalAlpha = 1 - groundTransitionProgress;
    ctx.drawImage(groundImage, groundX, groundY2, canvas.width, canvas.height - groundY2);
    ctx.drawImage(groundImage, groundX + canvas.width, groundY2, canvas.width, canvas.height - groundY2);

    ctx.globalAlpha = groundTransitionProgress;
    ctx.drawImage(snowyGroundImage, groundX, groundY2, canvas.width, canvas.height - groundY2);
    ctx.drawImage(snowyGroundImage, groundX + canvas.width, groundY2, canvas.width, canvas.height - groundY2);

    ctx.globalAlpha = 1;
  }

if (snowIntensity > 0) {
  drawSnowEffect();
}

  // Ay ve yıldızların opaklığını nightProgress ile ayarla
  ctx.globalAlpha = nightProgress;

  drawMoon();
  drawStars();

  ctx.globalAlpha = 1; // Alfa sıfırla
}


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
drawBackground();
if (isNight) {
  drawStars();
  drawMoon();
}
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
 startColor = { r: 112, g: 197, b: 206 }; // #70c5ce
const endColor = { r: 180, g: 200, b: 220 };   // daha soğuk kış rengi

function lerp(a, b, t) { return a + (b - a) * t; }

const r = Math.floor(lerp(startColor.r, endColor.r, groundTransitionProgress));
const g = Math.floor(lerp(startColor.g, endColor.g, groundTransitionProgress));
const b = Math.floor(lerp(startColor.b, endColor.b, groundTransitionProgress));

sky.addColorStop(0, `rgb(${r},${g},${b})`);
sky.addColorStop(1, '#fff');
  ctx.fillStyle = sky;
  //ctx.fillRect(0, 0, canvas.width, groundY + 40);

const gx = Math.floor(groundX);

// snowyGroundImage yüklendiyse ve geçiş başladıysa
if (
  groundTransitionProgress > 0 &&
  snowyGroundImage.complete &&
  snowyGroundImage.naturalWidth > 0
) {
  ctx.globalAlpha = 1;
  ctx.drawImage(groundImage, gx, groundY, canvas.width, canvas.height - groundY);
  ctx.drawImage(groundImage, gx + canvas.width, groundY, canvas.width, canvas.height - groundY);
  const easedProgress = Math.pow(groundTransitionProgress, 2); // yumuşatma
  ctx.globalAlpha = easedProgress;
  ctx.drawImage(snowyGroundImage, gx, groundY, canvas.width, canvas.height - groundY);
  ctx.drawImage(snowyGroundImage, gx + canvas.width, groundY, canvas.width, canvas.height - groundY);

  ctx.globalAlpha = 1;
} else {
  // Sadece normal zemin çiz
  ctx.drawImage(groundImage, gx, groundY, canvas.width, canvas.height - groundY);
  ctx.drawImage(groundImage, gx + canvas.width, groundY, canvas.width, canvas.height - groundY);
}

  if (allImagesLoaded()) {
    const img = frames[currentFrame];
    const w = img.width * character.scale;
    const h = img.height * character.scale;
    character.width = w;
    character.height = h;

    ctx.save();

    if (isRespawning) {
      const alpha = 0.5 + 0.5 * Math.sin(performance.now() / 100);
      ctx.globalAlpha = alpha;
    } else if (isInvincible) {
      const time = performance.now() / 200;
      const alpha = 0.65 + 0.35 * Math.sin(time);
      ctx.globalAlpha = alpha;
    }

    // Yerine:
if (isDying) {
  ctx.save();

  const elapsed = performance.now() - dyingStartTime;
  const progress = Math.min(elapsed / dyingDuration, 1); // 0..1 arası

  // Küçülme: 1 - progress (başta 1, sonunda 0)
  const scale = 1 - progress;

  // Döndürme: 0’dan 3 tam tura kadar (3 * 2pi)
  const rotation = progress * 3 * 2 * Math.PI;

  const centerX = character.x + w / 2;
  const centerY = character.y + h / 2;

  ctx.globalAlpha = 0.6 * (1 - progress); // Yavaşça saydamlaştır

  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  ctx.restore();
} else {
  ctx.drawImage(img, character.x, character.y, w, h);
}
    ctx.restore();

    // 💎 ELMAS Glow efekti (diamonds içindeki elmaslar)
    diamonds.forEach(d => {
      drawDiamondGlow(ctx, d.x, d.y, d.width, d.height, performance.now() / 1000);
    });

    // 💎 ELMAS Glow efekti (items içindeki elmaslar, şapkalar hariç)
    items.forEach(item => {
      if (item.type !== 'hat') {
        drawDiamondGlow(ctx, item.x, item.y, item.width, item.height, performance.now() / 1000);
      }
    });
    
    // ☁️ Bulutlar
    drawClouds();

    // 🟫 Platformlar
    // (platformları çiziyorsan buraya ekle)

    // 🪨 Engeller
    drawObstacles();

    // 🎩 Öğeler
    drawItems();
drawHealEffects();
    // 💰 Coin'ler
    drawFitcoins();
    // 🍤 Karidesleri çiz
    shrimps.forEach(shrimp => {
      if (shrimpImage.complete) {
        ctx.drawImage(shrimpImage, shrimp.x, shrimp.y, shrimp.width, shrimp.height);
      }
    });
    // 💎 Elmasları çiz (diamonds içindekiler)
    diamonds.forEach(d => {
      const img = diamondImages[d.color];
      if (img) {
        ctx.drawImage(img, d.x, d.y, d.width, d.height);
      }
    });

    // 💎 Elmasları çiz (items içindekiler, şapkalar hariç)
    items.forEach(item => {
      if (item.type !== 'hat') {
        const img = diamondImages[item.type];
        if (img) {
          ctx.drawImage(img, item.x, item.y, item.width, item.height);
        }
      }
    });

    // 🧮 Puan göstergesi
    drawPointCounter();
  }

  // 🟥 Ortadaki büyük mesaj
  if (centerMessage) {
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255, 0, 0, ${centerMessage.opacity})`;
    ctx.font = "32px Georgia";
    ctx.fillText(centerMessage.title, canvas.width / 2, canvas.height / 2 - 10);

    ctx.fillStyle = `rgba(255, 255, 255, ${centerMessage.opacity})`;
    ctx.font = "20px Arial";
    ctx.fillText(centerMessage.subtitle, canvas.width / 2, canvas.height / 2 + 20);
  }
}
function showWinOverlay(fitcoins, totalPoints) {
  const messages = [
    "🚀 You outran the future itself!",
    "💎 Stellar performance, runner!",
    "⚡ Hyperdrive activated. All coins collected!",
    "🌌 You are the legend of Anoma!",
    "🪐 Fitcoins secured. Galaxy thanks you!",
    "🔥 Your speed broke the time barrier!",
    "✨ Quantum runner mode: SUCCESS!"
  ];

  const randomIndex = Math.floor(Math.random() * messages.length);
  const randomMessage = messages[randomIndex];

  document.getElementById("win-message").textContent = randomMessage;
  document.getElementById("win-points").innerHTML = `
    <span style="display:block; margin-top:10px;">💰 Fitcoins: <strong>${fitcoins}</strong></span>
    <span style="display:block;">🏆 Points: <strong>${totalPoints}</strong></span>
  `;

  document.getElementById("win-overlay").classList.remove("hidden");

  const restartBtn = document.getElementById("win-restart-btn");
  restartBtn.onclick = () => location.reload();
}

function showLoseOverlay() {
  // Mevcut fitcoin ve point değerlerini yaz
  loseCoinsText.textContent  = collectedFitcoins;
  losePointsText.textContent = totalPoints;

  // Overlay’i göster, canvas’ı ve start-overlay’ı gizle
  loseOverlay.classList.remove('hidden');
  startOverlay.style.display = 'none';
  // Oynanmayı durdur:
  gameOver = true;
}

// Restart butonuna tıklandığında sayfayı yenile veya başa al
loseRestartBtn.onclick = () => {
  location.reload(); // ya da initGame(); gibi kendi reset fonksiyonun
};



function gameLoop(timestamp = 0) {
  update(timestamp);
  draw();
  if (!gameOver) requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    jumpKeyHeld = true;
    jumpStart();  // Zıplama girişimi
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    jumpKeyHeld = false;
    jumpEnd();  // Zıplamayı sonlandır
  }
});

startBtn.addEventListener('click', () => {
  if (!allImagesLoaded()) {
    alert('Animation frames are loading, please wait a few seconds and press the start button again...');
    return;
  }

  // Start overlay gizleniyor (oyun ekranı açılıyor)
  startOverlay.style.display = 'none';

  // Oyun başlatılıyor
  gameStarted = true;
  gameOver = false;
  lives = 3;
  isRespawning = false;
  respawnTime = 0;

  currentFrame = 0;
  lastFrameTime = 0;
  gameStartTime = null;
  collectedFitcoins = 0;
  totalPoints = 0;
  fitcoins.length = 0;
  items.length = 0;
  platforms.length = 0;  
  obstacles.length = 0;
  floatingTexts.length = 0;
  centerMessage = null;
  isBoosted = false;
  boostEndTime = 0;
  isInvincible = false;
  invincibleEndTime = 0;
  groundX = 0;
  character.vy = 0;
  character.onGround = true;
  character.x = 80;
  createClouds();
createSnowflakes();
createStars();
  const firstImg = frames[0];
  character.width = firstImg.width * character.scale;
  character.height = firstImg.height * character.scale;
  character.y = groundY2 - character.height;
  groundTransitionProgress = 0;
  // Start butonu gizleniyor
  startBtn.style.display = 'none';
// Kazandın paneli başta gizli kalsın
document.getElementById('win-overlay').classList.add('hidden');
  // Oyun döngüsü başlatılıyor
  requestAnimationFrame(gameLoop);
});

