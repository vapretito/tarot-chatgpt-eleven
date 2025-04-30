'use strict';

var Deck = (function () {
  'use strict';

  var ticking;
  var animations = [];
  window.clickedCards = [];

  const nombresCartas = [
    "El Loco", "El Mago", "La Sacerdotisa", "La Emperatriz", "El Emperador",
    "El Hierofante", "Los Enamorados", "El Carro", "La Justicia", "El Ermitaño",
    "La Rueda de la Fortuna", "La Fuerza", "El Colgado", "La Muerte", "La Templanza",
    "El Diablo", "La Torre", "La Estrella", "La Luna", "El Sol", "El Juicio", "El Mundo"
  ];
  
  const nombresCartasEN = [
    "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
    "The Hierophant", "The Lovers", "The Chariot", "Justice", "The Hermit",
    "Wheel of Fortune", "Strength", "The Hanged Man", "Death", "Temperance",
    "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World"
  ];


  function animationFrames(delay, duration) {
    var now = Date.now();

    // calculate animation start/end times
    var start = now + delay;
    var end = start + duration;

    var animation = {
      start: start,
      end: end
    };

    // add animation
    animations.push(animation);

    if (!ticking) {
      // start ticking
      ticking = true;
      requestAnimationFrame(tick);
    }
    var self = {
      start: function start(cb) {
        // add start callback (just one)
        animation.startcb = cb;
        return self;
      },
      progress: function progress(cb) {
        // add progress callback (just one)
        animation.progresscb = cb;
        return self;
      },
      end: function end(cb) {
        // add end callback (just one)
        animation.endcb = cb;
        return self;
      }
    };
    return self;
  }

  function tick() {
    var now = Date.now();

    if (!animations.length) {
      // stop ticking
      ticking = false;
      return;
    }

    for (var i = 0, animation; i < animations.length; i++) {
      animation = animations[i];
      if (now < animation.start) {
        // animation not yet started..
        continue;
      }
      if (!animation.started) {
        // animation starts
        animation.started = true;
        animation.startcb && animation.startcb();
      }
      // animation progress
      var t = (now - animation.start) / (animation.end - animation.start);
      animation.progresscb && animation.progresscb(t < 1 ? t : 1);
      if (now > animation.end) {
        // animation ended
        animation.endcb && animation.endcb();
        animations.splice(i--, 1);
        continue;
      }
    }
    requestAnimationFrame(tick);
  }

  // fallback
  window.requestAnimationFrame || (window.requestAnimationFrame = function (cb) {
    setTimeout(cb, 0);
  });

  var style = document.createElement('p').style;
  var memoized = {};

  function prefix(param) {
    if (typeof memoized[param] !== 'undefined') {
      return memoized[param];
    }

    if (typeof style[param] !== 'undefined') {
      memoized[param] = param;
      return param;
    }

    var camelCase = param[0].toUpperCase() + param.slice(1);
    var prefixes = ['webkit', 'moz', 'Moz', 'ms', 'o'];
    var test;

    for (var i = 0, len = prefixes.length; i < len; i++) {
      test = prefixes[i] + camelCase;
      if (typeof style[test] !== 'undefined') {
        memoized[param] = test;
        return test;
      }
    }
  }

  var has3d;

  function translate(a, b, c) {
    typeof has3d !== 'undefined' || (has3d = check3d());

    c = c || 0;

    if (has3d) {
      return 'translate3d(' + a + ', ' + b + ', ' + c + ')';
    } else {
      return 'translate(' + a + ', ' + b + ')';
    }
  }

  function check3d() {
    // I admit, this line is stealed from the great Velocity.js!
    // http://julian.com/research/velocity/
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) {
      return false;
    }

    var transform = prefix('transform');
    var $p = document.createElement('p');

    document.body.appendChild($p);
    $p.style[transform] = 'translate3d(1px,1px,1px)';

    has3d = $p.style[transform];
    has3d = has3d != null && has3d.length && has3d !== 'none';

    document.body.removeChild($p);

    return has3d;
  }

  function createElement(type) {
    return document.createElement(type);
  }

  var maxZ = 52;

  function _card(i) {
    var transform = prefix('transform');

    // calculate rank/suit, etc..
    var rank = i % 13 + 1;
    var suit = i / 13 | 0;
    var z = (52 - i) / 4;

    // create elements
    var $el = createElement('div');
    var $face = createElement('div');
    var $back = createElement('div');

    // states
    var isDraggable = false;
    var isFlippable = false;

    // self = card
    var self = { i: i, rank: rank, suit: suit, pos: i, $el: $el, mount: mount, unmount: unmount, setSide: setSide };

    var modules = Deck.modules;
    var module;

    // add classes
    $face.classList.add('face');
    $back.classList.add('back');

    // add default transform
    $el.style[transform] = translate(-z + 'px', -z + 'px');
    $el.setAttribute("data-index", i); // ✅ importante para que tryFlip funcione


    // add default values
    self.x = -z;
    self.y = -z;
    self.z = z;
    self.rot = 0;

    // set default side to back
    self.setSide('back');

    // add drag/click listeners
    addListener($el, 'mousedown', onMousedown);
    addListener($el, 'touchstart', onMousedown);

    // load modules
    for (module in modules) {
      addModule(modules[module]);
    }

    self.animateTo = function (params) {
      var delay = params.delay;
      var duration = params.duration;
      var _params$x = params.x;
      var x = _params$x === undefined ? self.x : _params$x;
      var _params$y = params.y;
      var y = _params$y === undefined ? self.y : _params$y;
      var _params$rot = params.rot;
      var rot = _params$rot === undefined ? self.rot : _params$rot;
      var ease$$ = params.ease;
      var onStart = params.onStart;
      var onProgress = params.onProgress;
      var onComplete = params.onComplete;

      var startX, startY, startRot;
      var diffX, diffY, diffRot;

      animationFrames(delay, duration).start(function () {
        startX = self.x || 0;
        startY = self.y || 0;
        startRot = self.rot || 0;
        onStart && onStart();
      }).progress(function (t) {
        var et = ease[ease$$ || 'cubicInOut'](t);

        diffX = x - startX;
        diffY = y - startY;
        diffRot = rot - startRot;

        onProgress && onProgress(t, et);

        self.x = startX + diffX * et;
        self.y = startY + diffY * et;
        self.rot = startRot + diffRot * et;

        $el.style[transform] = translate(self.x + 'px', self.y + 'px') + (diffRot ? 'rotate(' + self.rot + 'deg)' : '');
      }).end(function () {
        onComplete && onComplete();
      });
      $el.setAttribute("data-value", nombresCartas[i] || `Carta ${i}`);
      

    };

    // set rank & suit
    self.setRankSuit = function (rank, suit) {
      var suitName = SuitName(suit);
      $el.setAttribute('class', 'card ' + suitName + ' rank' + rank);
    };

    self.setRankSuit(rank, suit);

    self.enableDragging = function () {
      // this activates dragging
      if (isDraggable) {
        // already is draggable, do nothing
        return;
      }
      isDraggable = true;
      $el.style.cursor = 'move';
    };

    self.enableFlipping = function () {
      if (isFlippable) {
        // already is flippable, do nothing
        return;
      }
      isFlippable = true;
      
    };

    self.disableFlipping = function () {
      if (!isFlippable) {
        // already disabled flipping, do nothing
        return;
      }
      isFlippable = false;
    };

    self.disableDragging = function () {
      if (!isDraggable) {
        // already disabled dragging, do nothing
        return;
      }
      isDraggable = false;
      $el.style.cursor = '';
    };

    return self;

    function addModule(module) {
      // add card module
      module.card && module.card(self);
    }

    function onMousedown(e) {
      var startPos = {};
      var pos = {};
      var starttime = Date.now();

      e.preventDefault();

      // get start coordinates and start listening window events
      if (e.type === 'mousedown') {
        startPos.x = pos.x = e.clientX;
        startPos.y = pos.y = e.clientY;
        addListener(window, 'mousemove', onMousemove);
        addListener(window, 'mouseup', onMouseup);
      } else {
        startPos.x = pos.x = e.touches[0].clientX;
        startPos.y = pos.y = e.touches[0].clientY;
        addListener(window, 'touchmove', onMousemove);
        addListener(window, 'touchend', onMouseup);
      }

      if (!isDraggable) {
        // is not draggable, do nothing
        return;
      }

      // move card
      $el.style[transform] = translate(self.x + 'px', self.y + 'px') + (self.rot ? ' rotate(' + self.rot + 'deg)' : '');
      $el.style.zIndex = maxZ++;

      function onMousemove(e) {
        if (!isDraggable) {
          // is not draggable, do nothing
          return;
        }
        if (e.type === 'mousemove') {
          pos.x = e.clientX;
          pos.y = e.clientY;
        } else {
          pos.x = e.touches[0].clientX;
          pos.y = e.touches[0].clientY;
        }

        // move card
        $el.style[transform] = translate(Math.round(self.x + pos.x - startPos.x) + 'px', Math.round(self.y + pos.y - startPos.y) + 'px') + (self.rot ? ' rotate(' + self.rot + 'deg)' : '');
      }

      function onMouseup(e) {
        if (isFlippable && Date.now() - starttime < 200) {
          // flip sides
          self.setSide(self.side === 'front' ? 'back' : 'front');
        }
        if (e.type === 'mouseup') {
          removeListener(window, 'mousemove', onMousemove);
          removeListener(window, 'mouseup', onMouseup);
        } else {
          removeListener(window, 'touchmove', onMousemove);
          removeListener(window, 'touchend', onMouseup);
        }
        if (!isDraggable) {
          // is not draggable, do nothing
          return;
        }

        // set current position
        var offsetX = pos.x - startPos.x;
        var offsetY = pos.y - startPos.y;
        
        var dragDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        var dragTime = Date.now() - starttime;
        
        // Evitá división por cero
        var speed = dragTime > 0 ? dragDistance / dragTime : 0;
        
        // Escalá el movimiento según velocidad (limitarlo para que no explote)
        var power = Math.min(speed * 50, 40); // Ajustable: más multiplicador = más efecto
        
        var jitterX = (Math.random() - 0.5) * power;
        var jitterY = (Math.random() - 0.5) * power;
        var jitterRot = (Math.random() - 0.5) * (power / 2); // menos rotación
        
        self.animateTo({
          delay: 0,
          duration: 0.1,
          x: self.x + offsetX + jitterX,
          y: self.y + offsetY + jitterY,
          rot: self.rot + jitterRot
        });
        
        
      }
    }

    function mount(target) {
      // mount card to target (deck)
      target.appendChild($el);

      self.$root = target;
    }

    function unmount() {
      // unmount from root (deck)
      self.$root && self.$root.removeChild($el);
      self.$root = null;
    }

    function setSide(newSide) {
      // flip sides
      if (newSide === 'front') {
        if (self.side === 'back') {
          $el.removeChild($back);
        }
        self.side = 'front';
        $el.appendChild($face);
        self.setRankSuit(self.rank, self.suit);
      } else {
        if (self.side === 'front') {
          $el.removeChild($face);
        }
        self.side = 'back';
        $el.appendChild($back);
        $el.setAttribute('class', 'card');
      }
    };  
    
  }

  function SuitName(suit) {
    // return suit name from suit value
    return suit === 0 ? 'spades' : suit === 1 ? 'hearts' : suit === 2 ? 'clubs' : suit === 3 ? 'diamonds' : 'joker';
  }

  function addListener(target, name, listener) {
    target.addEventListener(name, listener);
  }

  function removeListener(target, name, listener) {
    target.removeEventListener(name, listener);
  }

  var ease = {
    linear: function linear(t) {
      return t;
    },
    quadIn: function quadIn(t) {
      return t * t;
    },
    quadOut: function quadOut(t) {
      return t * (2 - t);
    },
    quadInOut: function quadInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    cubicIn: function cubicIn(t) {
      return t * t * t;
    },
    cubicOut: function cubicOut(t) {
      return --t * t * t + 1;
    },
    cubicInOut: function cubicInOut(t) {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },
    quartIn: function quartIn(t) {
      return t * t * t * t;
    },
    quartOut: function quartOut(t) {
      return 1 - --t * t * t * t;
    },
    quartInOut: function quartInOut(t) {
      return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
    },
    quintIn: function quintIn(t) {
      return t * t * t * t * t;
    },
    quintOut: function quintOut(t) {
      return 1 + --t * t * t * t * t;
    },
    quintInOut: function quintInOut(t) {
      return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
    }
  };

  var flip = {
    deck: function deck(_deck) {
      _deck.flip = _deck.queued(flip);

      function flip(next, side) {
        var flipped = _deck.cards.filter(function (card) {
          return card.side === 'front';
        }).length / _deck.cards.length;

        _deck.cards.forEach(function (card, i) {
          card.setSide(side ? side : flipped > 0.5 ? 'back' : 'front');
        });
        next();
      }
    }
  };

  var sort = {
    deck: function deck(_deck2) {
      _deck2.sort = _deck2.queued(sort);

      function sort(next, reverse) {
        var cards = _deck2.cards;

        cards.sort(function (a, b) {
          if (reverse) {
            return a.i - b.i;
          } else {
            return b.i - a.i;
          }
        });

        cards.forEach(function (card, i) {
          card.sort(i, cards.length, function (i) {
            if (i === cards.length - 1) {
              next();
            }
          }, reverse);
        });
      }
    },
    card: function card(_card2) {
      var $el = _card2.$el;

      _card2.sort = function (i, len, cb, reverse) {
        var z = i / 4;
        var delay = i * 10;

        _card2.animateTo({
          delay: delay,
          duration: 400,

          x: -z,
          y: -150,
          rot: 0,

          onComplete: function onComplete() {
            $el.style.zIndex = i;
          }
        });

        _card2.animateTo({
          delay: delay + 500,
          duration: 400,

          x: -z,
          y: -z,
          rot: 0,

          onComplete: function onComplete() {
            cb(i);
          }
        });
      };
    }
  };

  function plusminus(value) {
    var plusminus = Math.round(Math.random()) ? -1 : 1;

    return plusminus * value;
  }

  function fisherYates(array) {
    var rnd, temp;

    for (var i = array.length - 1; i; i--) {
      rnd = Math.random() * i | 0;
      temp = array[i];
      array[i] = array[rnd];
      array[rnd] = temp;
    }

    return array;
  }

  function fontSize() {
    return window.getComputedStyle(document.body).getPropertyValue('font-size').slice(0, -2);
  }

  var ____fontSize;

  var shuffle = {
    deck: function deck(_deck3) {
      _deck3.shuffle = _deck3.queued(shuffle);

      function shuffle(next) {
        var cards = _deck3.cards;

        ____fontSize = fontSize();

        fisherYates(cards);

        cards.forEach(function (card, i) {
          card.pos = i;

          card.shuffle(function (i) {
            if (i === cards.length - 1) {
              next();
            }
          });
        });
        return;
      }
    },

    card: function card(_card3) {
      var $el = _card3.$el;

      _card3.shuffle = function (cb) {
        var i = _card3.pos;
        var z = i / 4;
        var delay = i * 2;

        _card3.animateTo({
          delay: delay,
          duration: 200,

          x: plusminus(Math.random() * 40 + 20) * ____fontSize / 16,
          y: -z,
          rot: 0
        });
        _card3.animateTo({
          delay: 200 + delay,
          duration: 200,

          x: -z,
          y: -z,
          rot: 0,

          onStart: function onStart() {
            $el.style.zIndex = i;
          },

          onComplete: function onComplete() {
            cb(i);
          }
        });
      };
    }
  };

  var __fontSize;

  var poker = {
    deck: function deck(_deck) {
      _deck.poker = _deck.queued(poker);
  
      function poker(next) {
        const cards = _deck.cards;
        const cardsToShow = 10;
        __fontSize = fontSize();
  
        const posiciones = [
          { x: 0, y: 0 },           // 1. Presente
          { x: 30, y: 0 },          // 2. Obstáculo (cruzada sobre la 1)
          { x: 0, y: 100 },         // 3. Raíz
          { x: -100, y: 0 },        // 4. Pasado reciente
          { x: 100, y: 0 },         // 5. Lo que está por llegar
          { x: 0, y: -100 },        // 6. Futuro cercano
          { x: 200, y: -100 },      // 7. Consultante
          { x: 200, y: -50 },       // 8. Entorno
          { x: 200, y: 0 },         // 9. Esperanzas y miedos
          { x: 200, y: 50 }         // 10. Resultado final
        ];
  
        cards.slice(-cardsToShow).forEach(function (card, i) {
          const offsetX = posiciones[i].x * (__fontSize / 16);
          const offsetY = posiciones[i].y * (__fontSize / 16);
  
          card.setSide('front');
  
          card.animateTo({
            delay: i * 200,
            duration: 400,
            x: offsetX,
            y: offsetY,
            rot: 0,
            onStart: function () {
              card.$el.style.zIndex = 100 + i;
            },
            onComplete: function () {
              if (i === cardsToShow - 1) next();
            }
          });
        });
      }
    },
  
    card: function card(_card) {
      var $el = _card.$el;
  
      _card.poker = function (i, total, cb) {
        const delay = i * 250;
        const spacing = window.innerWidth < 480 ? 90 : 140;
        const fanAngle = 10;
  
        const offsetX = (i - (total - 1) / 2) * spacing * __fontSize / 16;
        const offsetY = -280 * __fontSize / 16;
        const rotation = (i - (total - 1) / 2) * fanAngle;
  
        _card.animateTo({
          delay: delay,
          duration: 350,
          x: offsetX,
          y: offsetY,
          rot: rotation,
          onStart: function () {
            $el.style.zIndex = 100 + i;
          },
          onComplete: function () {
            cb(i);
          }
        });
      };
    }
  };

// var cruzCelta = {
//   deck: function deck(_deck) {
//     _deck.cruzCelta = _deck.queued(cruzCelta);

//     function cruzCelta(next) {
//       const cards = _deck.cards;
//       const cardsToShow = 10;
//       __fontSize = fontSize();

//       const posiciones = [
//         { x: 0, y: 0 },           // 1. Presente
//         { x: 30, y: 0 },          // 2. Obstáculo (cruzada sobre la 1)
//         { x: 0, y: 100 },         // 3. Raíz
//         { x: -100, y: 0 },        // 4. Pasado reciente
//         { x: 100, y: 0 },         // 5. Lo que está por llegar
//         { x: 0, y: -100 },        // 6. Futuro cercano
//         { x: 200, y: -100 },      // 7. Consultante
//         { x: 200, y: -50 },       // 8. Entorno
//         { x: 200, y: 0 },         // 9. Esperanzas y miedos
//         { x: 200, y: 50 }         // 10. Resultado final
//       ];

//       cards.slice(-cardsToShow).forEach(function (card, i) {
//         const offsetX = posiciones[i].x * (__fontSize / 16);
//         const offsetY = posiciones[i].y * (__fontSize / 16);

//         card.setSide('front');

//         card.animateTo({
//           delay: i * 200,
//           duration: 400,
//           x: offsetX,
//           y: offsetY,
//           rot: 0,
//           onStart: function () {
//             card.$el.style.zIndex = 100 + i;
//           },
//           onComplete: function () {
//             if (i === cardsToShow - 1) next();
//           }
//         });
//       });
//     }
//   },

//   card: function card(_card) {
//     // No necesitas agregar nada especial en cada carta para esta tirada
//   }
// };

  var intro = {
    deck: function deck(_deck5) {
      _deck5.intro = _deck5.queued(intro);

      function intro(next) {
        var cards = _deck5.cards;

        cards.forEach(function (card, i) {
          card.setSide('front');
          card.intro(i, function (i) {
            animationFrames(250, 0).start(function () {
              card.setSide('back');
            });
            if (i === cards.length - 1) {
              next();
            }
          });
        });
      }
    },
    card: function card(_card5) {
      var transform = prefix('transform');

      var $el = _card5.$el;

      _card5.intro = function (i, cb) {
        var delay = 500 + i * 10;
        var z = i / 4;

        $el.style[transform] = translate(-z + 'px', '-250px');
        $el.style.opacity = 0;

        _card5.x = -z;
        _card5.y = -250 - z;
        _card5.rot = 0;

        _card5.animateTo({
          delay: delay,
          duration: 1000,

          x: -z,
          y: -z,

          onStart: function onStart() {
            $el.style.zIndex = i;
          },
          onProgress: function onProgress(t) {
            $el.style.opacity = t;
          },
          onComplete: function onComplete() {
            $el.style.opacity = '';
            cb && cb(i);
          }
        });
      };
    }
  };

  var _fontSize;
  function clampToScreen(x, y, cardWidth, cardHeight, extraPadding = 0) {
    const padding = 10 + extraPadding;
    const maxX = window.innerWidth - cardWidth - padding;
    const maxY = window.innerHeight - cardHeight - padding;
  
    return {
      x: Math.min(Math.max(x, padding), maxX),
      y: Math.min(Math.max(y, padding), maxY)
    };
  }
  var fan = {
    deck: function deck(_deck6) {
      _deck6.fan = _deck6.queued(fan);
  
      function fan(next) {
        var cards = _deck6.cards;
        var len = cards.length;
  
        _fontSize = fontSize();
  
        // Reiniciar contador global
        window.cardsFlipped = 0;
        window.allFanCards = cards; // Guardar referencia para luego bloquear
        window.clickedCards = []; // Reinicia el array al comenzar
        window.mensajeEnviado = false;


        cards.forEach(function (card, i) {
          card.setSide('back');
  
          card.fan(i, len, function (i) {
            if (i === cards.length - 1) {
              next();
            }
          });
        });
      }
    },
  
    card: function card(_card6) {
      var $el = _card6.$el;
      let flipped = false;
      let dragged = false;
  
      _card6.fan = function (i, len, cb) {
        const z = i / 4;
        const delay = i * 10;
        const isMobile = window.innerWidth <= 540;
  
        const maxAngle = isMobile ? 110 : 140;
        const angle = (i / (len - 1)) * maxAngle - (maxAngle / 2);
  
        _card6.animateTo({
          delay: delay,
          duration: 300,
          x: -z,
          y: -z,
          rot: 0
        });
  
        const radius = (isMobile ? window.innerWidth * 0.5 : 350) * (_fontSize / 16);
        const offsetX = isMobile ? 60 : 0;
        const offsetY = isMobile ? -60 : -100;
  
        const xPos = -Math.cos(deg2rad(angle)) * radius + offsetX;
        const yPos = -Math.sin(deg2rad(angle)) * radius + offsetY;
  
        const clamped = clampToScreen(
          xPos + window.innerWidth / 2,
          yPos + window.innerHeight / 2,
          112,
          192,
          12
        );
  
        _card6.animateTo({
          delay: 300 + delay,
          duration: 300,
          x: clamped.x - window.innerWidth / 2,
          y: clamped.y - window.innerHeight / 2,
          rot: angle * 0.4,
          onStart: function () {
            $el.style.zIndex = i;
          },
          onComplete: function () {
            cb(i);
          }
        });
  
        $el.onclick = null;
        $el.style.pointerEvents = 'auto';
  
        $el.addEventListener('mousedown', () => { dragged = true; });
        $el.addEventListener('touchstart', () => { dragged = true; });
  
        function tryFlip() {
          if (!flipped && window.cardsFlipped < 3) {
            _card6.setSide('front');
            flipped = true;
        
            // Guardamos la carta seleccionada
            const cartaIndex = parseInt(_card6.$el.getAttribute("data-index"), 10);
            window.clickedCards.push({
            index: cartaIndex,
             carta: _card6
             });

        
            window.cardsFlipped++;
        
            // ✅ Permite que la carta seleccionada siga siendo movible
            // pero no la bloqueamos completamente
            $el.removeEventListener('mouseup', tryFlip);
            $el.removeEventListener('touchend', tryFlip);
            $el.removeEventListener('click', tryFlip);
        
            // Cuando se eligen las 3, enviamos la interpretación completa
            if (window.cardsFlipped === 3 && !window.mensajeEnviado) {
              window.mensajeEnviado = true;
              bloquearCartasRestantes();
            
              const idioma = window.idiomaSeleccionado || "es";
              const [c1, c2, c3] = window.clickedCards; // 🔥 Esta línea es clave
              const nombreInput = document.getElementById("nombre-usuario");
              const nombre = nombreInput?.value?.trim() || "Consultante";
              window.nombreUsuario = nombre;

              const nombres = idioma === "en" ? nombresCartasEN : nombresCartas;
              const texto = idioma === "en"
               ? `My name is ${nombre} and I want to know the tarot reading interpretation:\nPast: ${nombres[c1.index]}\nPresent: ${nombres[c2.index]}\nFuture: ${nombres[c3.index]}`
               : `Mi nombre es ${nombre} y quiero saber la interpretación de la lectura del tarot:\nPasado: ${nombres[c1.index]}\nPresente: ${nombres[c2.index]}\nFuturo: ${nombres[c3.index]}`;

            
              console.log("🧠 Texto enviado a GPT:", texto);
            
              fetch("/respuesta", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ texto, idioma, nombre })

              })
                .then(res => res.blob())
                .then(blob => {
                  const audio = new Audio(URL.createObjectURL(blob));
                  audio.id = "audio-chatgpt"; // ✅ ID necesario para el visualizador
                  document.body.appendChild(audio); // opcional si querés tenerlo en el DOM
                  audio.volume = 0.9;
                
                  audio.addEventListener("play", () => {
                    iniciarVisualizadorAudio("audio-chatgpt"); // ✅ Activamos la esfera
                  });
                
                  audio.addEventListener("ended", () => {
                    document.getElementById("audio-visualizer").style.display = "none"; // ✅ Ocultamos luego
                    audio.remove(); // limpieza
                  });
                
                  audio.play().catch(err => {
                    console.error("🎧 Error al reproducir audio:", err);
                  });
                })
                
                .catch(err => console.error("🎙️ Error al obtener audio:", err));
            }
          }
        }
        
        
  
        $el.addEventListener('mouseup', tryFlip);
        $el.addEventListener('touchend', tryFlip);
  
        function bloquearCartasRestantes() {
          window.allFanCards.forEach(function (c) {
            const wasClicked = window.clickedCards.includes(c);
            c.$el.style.pointerEvents = wasClicked ? 'auto' : 'none';
          });
        }
      };
    }
  };
  
  

  

  function deg2rad(degrees) {
    return degrees * Math.PI / 180;
  }

  var ___fontSize;

  var bysuit = {
    deck: function deck(_deck7) {
      _deck7.bysuit = _deck7.queued(bysuit);

      function bysuit(next) {
        var cards = _deck7.cards;

        ___fontSize = fontSize();

        cards.forEach(function (card) {
          card.setSide('front');

          card.bysuit(cards.length, function (i) {
            if (i === cards.length - 1) {
              next();
            }
          });
        });
      }
    },
    card: function card(_card7) {
      var rank = _card7.rank;
      var suit = _card7.suit;

      _card7.bysuit = function (totalCards, cb) {
        const i = _card7.i;
        const delay = i * 10;
      
        const isMobile = window.innerWidth <= 768;
      
        let spacingX = 140;
        let spacingY = 250;
        let columns = 11;
      
        if (isMobile) {
          const cardWidth = 70;
          spacingX = cardWidth + 5;
          spacingY = 130;
          columns = Math.floor(window.innerWidth / spacingX);
          columns = Math.max(columns, 1);
        }
      
        const row = Math.floor(i / columns);
        const col = i % columns;
      
        const totalRows = Math.ceil(totalCards / columns);
        const centerX = (columns - 1) / 2;
        const centerY = (totalRows - 1) / 2;
      
        const x = (col - centerX) * spacingX;
        const y = (row - centerY) * spacingY;
      
        _card7.animateTo({
          delay: delay,
          duration: 400,
          x: x,
          y: y,
          rot: 0,
          onComplete: function () {
            cb(i);
            }
          });
        };
      }
    };
          

  function queue(target) {
    var array = Array.prototype;

    var queueing = [];

    target.queue = queue;
    target.queued = queued;

    return target;

    function queued(action) {
      return function () {
        var self = this;
        var args = arguments;

        queue(function (next) {
          action.apply(self, array.concat.apply(next, args));
        });
      };
    }

    function queue(action) {
      if (!action) {
        return;
      }

      queueing.push(action);

      if (queueing.length === 1) {
        next();
      }
    }
    function next() {
      queueing[0](function (err) {
        if (err) {
          throw err;
        }

        queueing = queueing.slice(1);

        if (queueing.length) {
          next();
        }
      });
    }
  }

  function observable(target) {
    target || (target = {});
    var listeners = {};

    target.on = on;
    target.one = one;
    target.off = off;
    target.trigger = trigger;

    return target;

    function on(name, cb, ctx) {
      listeners[name] || (listeners[name] = []);
      listeners[name].push({ cb: cb, ctx: ctx });
    }

    function one(name, cb, ctx) {
      listeners[name] || (listeners[name] = []);
      listeners[name].push({
        cb: cb, ctx: ctx, once: true
      });
    }

    function trigger(name) {
      var self = this;
      var args = Array.prototype.slice(arguments, 1);

      var currentListeners = listeners[name] || [];

      currentListeners.filter(function (listener) {
        listener.cb.apply(self, args);

        return !listener.once;
      });
    }

    function off(name, cb) {
      if (!name) {
        listeners = {};
        return;
      }

      if (!cb) {
        listeners[name] = [];
        return;
      }

      listeners[name] = listeners[name].filter(function (listener) {
        return listener.cb !== cb;
      });
    }
  }

  function Deck(jokers) {
    // init cards array
    var cards = new Array(22);

    var $el = createElement('div');
    var self = observable({ mount: mount, unmount: unmount, cards: cards, $el: $el });
    var $root;

    var modules = Deck.modules;
    var module;

    // make queueable
    queue(self);

    // load modules
    for (module in modules) {
      addModule(modules[module]);
    }

    // add class
    $el.classList.add('deck');

    var card;

    // create cards
    for (var i = cards.length; i; i--) {
      card = cards[i - 1] = _card(i - 1);
      card.setSide('back');
      card.mount($el);
    }

    return self;

    function mount(root) {
      // mount deck to root
      $root = root;
      $root.appendChild($el);
    }

    function unmount() {
      // unmount deck from root
      $root.removeChild($el);
    }

    function addModule(module) {
      module.deck && module.deck(self);
    }
  }
  Deck.animationFrames = animationFrames;
  Deck.ease = ease;
  Deck.modules = { bysuit: bysuit, fan: fan, intro: intro, poker: poker, shuffle: shuffle, sort: sort, flip: flip };
  Deck.Card = _card;
  Deck.prefix = prefix;
  Deck.translate = translate;

  return Deck;
})();
