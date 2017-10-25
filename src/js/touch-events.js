/*!
 * Event Burrito is a touch / mouse / pointer event unifier
 * https://github.com/wilddeer/Event-Burrito
 * Copyright Oleg Korsunsky | http://wd.dizaina.net/
 *
 * MIT License
 *
 * NOTE: Event Burrito has been modified from
 * its original form to suit this project.
 */

/* exported TouchEvents */
function TouchEvents(_this, options) {
  'use strict';

  const touchStateCallback = () => {},
    o = {
      preventDefault: true,
      mouse: true,
      dragThreshold: 10, // Minimum distance to determine swipe direction
      start: touchStateCallback,
      move: touchStateCallback,
      end: touchStateCallback
    };

  // Merge user options into defaults
  options && mergeObjects(o, options);

  let start = {},
    diff = {},
    direction,
    eventType,
    axis,
    support = {
      pointerEvents: !!window.navigator.pointerEnabled,
      msPointerEvents: !!window.navigator.msPointerEnabled
    },
    eventModel = (support.pointerEvents ? 1 : (support.msPointerEvents ? 2 : 0)),
    events = [
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'], //touch events
      ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'], //pointer events
      ['MSPointerDown', 'MSPointerMove', 'MSPointerUp', 'MSPointerCancel'], //IE10 pointer events
      ['mousedown', 'mousemove', 'mouseup', false] //mouse events
    ],
    checks = [
      //touch events
      (e) =>{
        //skip the event if it's multitouch or pinch move
        return (e.touches && e.touches.length > 1) || (e.scale && e.scale !== 1);
      },
      //pointer events
      (e) => {
        //Skip it, if:
        //1. event is not primary (other pointers during multitouch),
        //2. left mouse button is not pressed,
        //3. mouse drag is disabled and event is not touch
        return !e.isPrimary || (e.buttons && e.buttons !== 1) || (!o.mouse && e.pointerType !== 'touch' && e.pointerType !== 'pen');
      },
      //IE10 pointer events
      (e) => {
        //same checks as in pointer events
        return !e.isPrimary || (e.buttons && e.buttons !== 1) || (!o.mouse && e.pointerType !== e.MSPOINTER_TYPE_TOUCH && e.pointerType !== e.MSPOINTER_TYPE_PEN);
      },
      //mouse events
      (e) => {
        //skip the event if left mouse button is not pressed
        //in IE7-8 `buttons` is not defined, in IE9 LMB is 0
        return (e.buttons && e.buttons !== 1);
      }
    ];


  function mergeObjects(targetObj, sourceObject) {
    for (let key in sourceObject) {
      if (sourceObject.hasOwnProperty(key)) {
        targetObj[key] = sourceObject[key];
      }
    }
  }


  function addEvent(el, event, func, bool) {
    if (!event) return;
    el.addEventListener(event, func, !!bool);
  }


  function removeEvent(el, event, func, bool) {
    if (!event) return;
    el.removeEventListener(event, func, !!bool);
  }


  function preventDefault(event) {
    event.preventDefault ? event.preventDefault() : event.returnValue = false;
  }


  function getDiff(event) {
    diff = {
      X: (eventType ? event.clientX : event.touches[0].clientX) - start.X,
      Y: (eventType ? event.clientY : event.touches[0].clientY) - start.Y,
      time: new Date().getTime() - start.time
    };
  }


  function touchStart(event, type) {
    direction = '';
    eventType = type;

    if (checks[eventType](event)) return;
    if (preventDefault && eventType) preventDefault(event);

    addEvent(document, events[eventType][1], touchMove);
    addEvent(document, events[eventType][2], touchEnd);
    addEvent(document, events[eventType][3], touchEnd);

    start = {
      X: eventType ? event.clientX : event.touches[0].clientX,
      Y: eventType ? event.clientY : event.touches[0].clientY,
      time: new Date().getTime()
    };

    for (let key in diff) {
      diff[key] = 0;
    }
    o.start(event);
  }


  function touchMove(event) {
    getDiff(event);

    //Prevent document from scrolling while swiping because some mobile browsers flicker during transition and scroll.
    document[`on${events[eventType][1]}`] = (e) => { preventDefault(e); };

    if (!axis) {
      axis = (o.dragThreshold < Math.abs(diff.X)) ? 'X' : (o.dragThreshold < Math.abs(diff.Y)) ? 'Y' : false;
    } else {
      if (axis === 'X') {
        direction = (diff.X < 0) ? 'left' : 'right';
        preventDefault && preventDefault(event);
      } else if (axis === 'Y') {
        direction = (diff.Y < 0) ? 'up' : 'down';
      }
    }

    o.move(event, direction, diff);
  }


  function touchEnd(event) {
    removeEvent(document, events[eventType][1], touchMove);
    removeEvent(document, events[eventType][2], touchEnd);
    removeEvent(document, events[eventType][3], touchEnd);

    //Enable document scrolling
    document[`on${events[eventType][1]}`] = (e) => { return true; };

    o.end(event, direction, diff);
    axis = false;
  }


  function init() {
    // Bind touchstart
    addEvent(_this, events[eventModel][0], (event) => {
      touchStart(event, eventModel);
    });
    // Prevent stuff from dragging when using mouse
    addEvent(_this, 'dragstart', preventDefault);

    // Bind mousedown if necessary
    if (o.mouse && !eventModel) {
      addEvent(_this, events[3][0], (event) => {
        touchStart(event, 3);
      });
    }

    // No clicking during touch
    addEvent(_this, 'click', (event) => {
      if (Math.abs(diff.X) > o.dragThreshold) {
        event.preventDefault();
      }
    });
  }

  // Init touch listeners
  init();
}
