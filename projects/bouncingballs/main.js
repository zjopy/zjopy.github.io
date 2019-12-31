// Setup canvas

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const width = canvas.width = window.innerWidth;
const height = canvas.height = window.innerHeight;

// Remaining ball counter

para = document.querySelector('p');
let eatenBalls = 0;

function updateCounter(eatenBalls) {
  const remainingBalls = numberOfBalls - eatenBalls;
  para.textContent = `Ball count: ${remainingBalls}`;

  if (remainingBalls === 0) {
    cancelAnimation();
  }
}

// Random number generator

function random(min, max) {
  const num = Math.floor(Math.random() * (max - min)) + min;
  return num;
}

// Shape class

class Shape {
  constructor(x, y, velX, velY, exists) {
    this.x = x;
    this.y = y;
    this.velX = velX;
    this.velY = velY;
    this.exists = exists;
  }
}

// Ball subclass

class Ball extends Shape {
  constructor(x, y, velX, velY, exists, color, size) {
    super(x, y, velX, velY, exists);
    this.color = color;
    this.size = size; // radius
  }
}

// Draw method

Ball.prototype.draw = function() {
  ctx.beginPath();
  ctx.fillStyle = this.color;
  ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
  ctx.fill();
}

// Update position method

Ball.prototype.updatePosition = function() {
  if ((this.x + this.size) >= width) {
    this.velX = -(this.velX);
  }

  if ((this.x - this.size) <= 0) {
    this.velX = -(this.velX);
  }

  if ((this.y + this.size) >= height) {
    this.velY = -(this.velY);
  }

  if ((this.y - this.size) <= 0) {
    this.velY = -(this.velY);
  }

  this.x += this.velX;
  this.y += this.velY;
}

// Make balls

let balls = [];
const numberOfBalls = 25;
const maxVelocity = 7;

while (balls.length < numberOfBalls) {
  let size = random(15, 20);
  let ball = new Ball(
    // ball position always drawn at least one ball width
    // away from the edge of the canvas, to avoid drawing errors
    random(0 + size, width - size),
    random(0 + size, height - size),
    random(-maxVelocity, maxVelocity),
    random(-maxVelocity, maxVelocity),
    true,
    'rgb(' + random(0, 255) + ',' + random(0, 255) + ',' + random(0, 255) + ')',
    size
  );

  balls.push(ball);
}

// Collision detection method

function distanceBalls(firstBall, secondBall) {
  const dx = firstBall.x - secondBall.x;
  const dy = firstBall.y - secondBall.y;
  return Math.sqrt(dx * dx + dy * dy);
}

Ball.prototype.collisionDetect = function() {
  for (let j = 0; j < balls.length; j++) {
    if (!(this === balls[j]) && balls[j].exists) {

      const distance = distanceBalls(this, balls[j]);
      const bothRadii = this.size + balls[j].size;

      if (distance <= bothRadii) {
        // balls[j].color = this.color = 'rgb(' + random(0, 255) + ',' + random(0, 255) + ',' + random(0, 255) + ')';
        const tmpVelX = this.velX;
        const tmpVelY = this.velY;
        this.velX = balls[j].velX;
        this.velY = balls[j].velY;
        balls[j].velX = tmpVelX;
        balls[j].velY = tmpVelY;
      }
    }
  }
}

// Evil Circle subclass

evilSize = 10;
class EvilCircle extends Shape {
  constructor(x, y, exists) {
    super(x, y, 20, 20, exists);
    this.color = 'white';
    this.size = evilSize; // radius
  }
}

// Draw method

EvilCircle.prototype.draw = function() {
  ctx.beginPath();
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 3;
  ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
  ctx.stroke();
}

// Update position method

EvilCircle.prototype.updatePosition = function() {
  if ((this.x + this.size) >= width) {
    this.x -= this.size;
  }

  if ((this.x - this.size) <= 0) {
    this.x += this.size;
  }

  if ((this.y + this.size) >= height) {
    this.y -= this.size;
  }

  if ((this.y - this.size) <= 0) {
    this.y += this.size;
  }
}

// Set controls method

EvilCircle.prototype.setControls = function() {
  let _this = this;
  window.onkeydown = function(e) {
    if (e.key === 'a') {
      _this.x -= _this.velX;
    } else if (e.key === 'd') {
      _this.x += _this.velX;
    } else if (e.key === 'w') {
      _this.y -= _this.velY;
    } else if (e.key === 's') {
      _this.y += _this.velY;
    }
  };
};

// Collision detection method

EvilCircle.prototype.collisionDetect = function() {
  for (let j = 0; j < balls.length; j++) {
    if (balls[j].exists) {
      const dx = this.x - balls[j].x;
      const dy = this.y - balls[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.size + balls[j].size) {
        balls[j].exists = false;
        eatenBalls++;
        updateCounter(eatenBalls);
      }
    }
  }
}

// Make Evil Circle

let evilCircle = new EvilCircle(random(0 + evilSize, width - evilSize), random(0 + evilSize, width - evilSize), true)
evilCircle.setControls();

// Animate

let requestID;

function loop() {
  // full screen black rectangle to cover up previous frame's drawing
  // semi-transparent to make trail behind ball
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < balls.length; i++) {
    if (balls[i].exists) {
      balls[i].draw();
      balls[i].updatePosition();
      balls[i].collisionDetect();
    }
  }

  evilCircle.draw();
  evilCircle.updatePosition();
  evilCircle.collisionDetect();

  requestID = requestAnimationFrame(loop);
}

loop();

// Cancel animation when done

function cancelAnimation() {
  cancelAnimationFrame(requestID);


  let h2 = document.createElement('h2');
  h2.innerHTML = "Congratulations!<br>You won!";
  h2.setAttribute("class", "banner");
  document.body.appendChild(h2);
}
