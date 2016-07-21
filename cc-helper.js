(function($){

  // Used as field names
  var clonedFieldName        = 'cch_cc_num_clone';
  // Used as IDs
  var errMsgDisplayContainer = 'cch-err-msg-container';
  var errMsgNumber           = 'cch-err-num';
  var errMsgCVC              = 'cch-err-cvc';

  // Declaring global
  CardHelper = function (userOptions) {

    var defaultOptions = {
      selectors : {
        form          : '#card-helper',
        inputNumber   : 'input[name="card-number"]',
        inputCVC      : 'input[name="card-cvc"]',
        errMsgDisplay : '#card-helper'
      },
      luhnValidation      : true,
      invalidFieldClass   : 'cch-invalid-number',
      modifyOnSubmit      : false,
      removePatternAttr   : false,
      preventSubmitIf     : {
        incompleteCardNum : true,
        incompleteCVC     : true,
        failedLuhn        : true,
      }
    };
    var opts = $.extend( {}, defaultOptions, userOptions );

    // Remove pattern attribute if specified (default: false)
    removePatternAttr(opts);

    // Setup hidden error message display container and individual error message elements for later display
    createErrMsgDisplay(opts);

    // Setup event listeners for fields requiring formatting and/or validation
    setListenerCardNum(opts);
    setListenerCardCVC(opts);
    setListenerFormSubmit(opts);

  };

  // Create hidden error message display container and individual error message elements.
  // Elsewhere, toggle visibility of these messages when error conditions are detected.
  function createErrMsgDisplay(opts) {
    if (!opts.selectors.errMsgDisplay) return;

    // TODO: throw error if ids exist, or use a class
    var hidden = ' style="display:none;"';
    var errMsgHTML = 
      ['<div id="'+ errMsgDisplayContainer +'"'+ hidden + '>',
         '<span id="'+ errMsgNumber           +'"'+ hidden + '>Invalid credit card number</span>',
         '<span id="'+ errMsgCVC              +'"'+ hidden + '>Invalid CVC</span>',
       '</div>',
      ].join('\n');
                        
    $(opts.selectors.errMsgDisplay).prepend( $(errMsgHTML) );
  }

  // Remove pattern attribute if specified (default: false)
  function removePatternAttr(opts) {
    if (!opts.removePatternAttr) return;
    $(opts.selectors.inputCVC).removeAttr('pattern');
    $(opts.selectors.inputNumber).removeAttr('pattern');
  }

  function cancelEvent(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }

  function setListenerFormSubmit (opts) {
    // check opts for prevent submit options
    $('body').on('submit', opts.selectors.form, evtHandlerFormSubmit);

    function evtHandlerFormSubmit (e) {
      var $cardNumInputEl = opts.modifyOnSubmit ? $('[name="'+clonedFieldName+'"]') : $(opts.selectors.inputNumber);
      var cardNum = $cardNumInputEl[0].value;

      var $cardCVCInputEl = $(opts.selectors.inputCVC);
      var cardCVC = $cardCVCInputEl[0].value;

      var o = opts.preventSubmitIf;

      // TODO: Abstract this into an option
      // Temp fix for HI humanitarian donation page
      var requireValidation = $('#gateway-authorize_net').attr('checked');

      // If any preventSubmit options are enabled, and the corresponding check
      // fails, cancel submission, and display the appropriate error message
      if ( requireValidation && o.incompleteCardNum && !isCompleteCardNum(cardNum) ) {
        displayErr( $cardNumInputEl, $('#'+errMsgNumber), opts );
        return cancelEvent(e);
      }
      if ( requireValidation && o.incompleteCVC && !isCompleteCVC(cardNum,cardCVC) ) {
        displayErr( $cardCVCInputEl, $('#'+errMsgCVC), opts );
        return cancelEvent(e);
      }
      if ( requireValidation && o.failedLuhn && !isValidLuhn(cardNum) ) return cancelEvent(e);



      // If a modifyOnSubmit callback is specified, run it on the value of the
      // cloned field, and insert the result into the hidden field for submission
      if (opts.modifyOnSubmit) {
        var $originalHidden = $(opts.selectors.inputNumber);
        var $clonedVisible  = $('[name="'+clonedFieldName+'"]');

        $originalHidden[0].value = opts.modifyOnSubmit( $clonedVisible[0].value );
      }
    }

  }

  function setListenerCardCVC (opts) {
    // Establish closure variables for event handler
    var prevVal = '';

    // Register event handler
    $(opts.selectors.form).on('input', opts.selectors.inputCVC, evtHandlerInputCardCVC);

    // Define event handler
    function evtHandlerInputCardCVC (e) {
      var currentVal = e.target.value;
      var maxLength = 4;

      // Record cursor position so we can return it to the proper position after modifying input
      var cursorPosition = this.selectionStart;

      if( /[^\d]/.test(currentVal)  ||  currentVal.length > maxLength ) {
        e.target.value = prevVal;
        this.setSelectionRange(cursorPosition-1,cursorPosition-1); // Re-position cursor appropriately
      } else {
        prevVal = currentVal;
        // TODO: perform this operation only if class is present
        hideErr($(e.target),$('#'+errMsgCVC), opts);
      }


    }
  }


  function setListenerCardNum (opts) {
    // Establish closure variables for event handler
    var prevVal       = '';
    var prevCardType  = '';
    var failedLuhnChk = false;

    var $evtListenerTarget = $(opts.selectors.inputNumber).first();

    // If a modifyOnSubmit callback is specified, create a visible clone of the field
    // for the user to interact with, and later during the submit event, execute the
    // provided callback on the field input and insert the result in the hidden field
    if (opts.modifyOnSubmit) {
      var $originalHidden = $evtListenerTarget;
      var $clonedVisible  = $originalHidden.clone().insertAfter($originalHidden);
      // Hide original
      $originalHidden[0].style.display = 'none';
      // Change name so it will not conflict with hidden original during submission
      $clonedVisible[0].name = clonedFieldName;
      // Set the visible clone as the target for validation and formatting user input
      $evtListenerTarget = $clonedVisible;
    }

    // Register event handler
    $evtListenerTarget.on('input', evtHandlerInputCardNum);

    // Define event handler
    function evtHandlerInputCardNum (e) {
      var currentVal = e.target.value;
      var cardType = getCardType(currentVal);
      var maxLength = getMaxCardNumLength(cardType);

      // Record cursor position so we can return it to the proper position after modifying input
      var cursorPosition = this.selectionStart;

      // Modify user input, adding spaces where necessary, and preventing spaces where they shouldn't be
      var currentValFormatted = '';
      currentVal.split('').forEach(function(char){
        var idx = currentValFormatted.length;
        // Handle American Express cards
        if( cardType === 'amex' ) {
          if ( ( idx === 4  || idx === 11 ) && char !== ' ' ) {
            currentValFormatted += ' ';
            if (cursorPosition === idx+1) cursorPosition++;
          } else if( idx !== 4 && idx !== 11 && char === ' ' ) return;
        // Handle all other cards
        } else {
          if( (idx+1) % 5 === 0 && char !== ' ' ) {
            currentValFormatted += ' ';
            if (cursorPosition === idx+1) cursorPosition++;
          } else if( (idx+1) % 5 !== 0 && char === ' ' ) return;
        }
        currentValFormatted += char;
      });

      // If attempted input contains any character that is not 0-9 or whitespace,
      // or is of invalid length, revert current input value to previous value.
      if( /[^\d^\s]/.test(currentVal)  ||  currentVal.length > maxLength ) {
        e.target.value = prevVal;
        this.setSelectionRange(cursorPosition-1,cursorPosition-1); // Re-position cursor appropriately

      // Otherwise, update the input field and prevVal variable with the correctly formatted input
      } else {
        prevVal = e.target.value = currentValFormatted;
        this.setSelectionRange(cursorPosition,cursorPosition); // Re-position cursor appropriately
        // TODO: perform this operation only if class is present
        hideErr( $(e.target), $('#'+errMsgNumber), opts );
      }


      // Update currentVal with whatever formatting may have been applied above
      currentVal = e.target.value;

      // If user specified a card type change callback
      if ( opts.onCardTypeChange ) {
        // Check card type a second time, post-formatting, to prevent erroneous call to card type change callback.
        // (e.g. if input was at max length, and user inserted a number at the 0 position that caused a type change,
        // flag, but was then reverted to prevVal)
        cardType = getCardType(currentVal);
        if (cardType !== prevCardType) {
          opts.onCardTypeChange(cardType, prevCardType);
          prevCardType = cardType;
        }
      }


      // If Luhn validation is enabled and card number is of complete length, validate using Luhn algorithm.
      // Add invalidFieldClass to input element if check fails. Remove class if check passes or input is incomplete.
      if( opts.luhnValidation ) {


        // If of complete length and failed Luhn
        if ( currentVal.length === maxLength && !isValidLuhn(currentVal) ) {
          failedLuhnChk = true;
          displayErr( $(e.target), $('#'+errMsgNumber), opts );
          opts.onValidityChange && opts.onValidityChange(false); // pass false, signifying invalid Luhn input
        }

        // If at max length, must have passed isValidLuhn above.
        // If less than max length, cannot perform isValidLuhn, so cannot be invalid.
        // In either case, cannot be invalid Luhn.
        // So, if also previously failedLuhnChk, remove failing class and call card validity change callback.
        else if ( failedLuhnChk && currentVal.length <= maxLength ) {
          failedLuhnChk = false;
          hideErr( $(e.target), $('#'+errMsgNumber), opts );
          opts.onValidityChange && opts.onValidityChange(true); // pass true, signifying valid or incomplete Luhn input
        }


      }
    }

    // Trigger the input event handler we just registered to ensure proper formatting 
    // in cases where the browser auto-populates the field on page load
    $evtListenerTarget.trigger('input');
  }

  // Takes a card number as input and returns a string of the card type (empty string if no type detected)
  function getCardType (cardNum) {
    cardNum += ''; // ensure input is string
    if      ( isVisa(cardNum)       ) return 'visa';
    else if ( isMastercard(cardNum) ) return 'mastercard';
    else if ( isAmex(cardNum)       ) return 'amex';
    else if ( isDiscover(cardNum)   ) return 'discover';
    else return '';

    // getCardType helpers. Expects card number n as string, and returns boolean.
    function isVisa       (n) { return n[0] === '4';                                    };
    function isMastercard (n) { return n[0] === '5' &&  n[1] >=   1  && n[1] <=   5;    };
    function isAmex       (n) { return n[0] === '3' && (n[1] === '4' || n[1] === '7');  };
    // TODO: Many other card types that begin with 6. Make this check more robust.
    function isDiscover   (n) { return n[0] === '6';                                    };
  }
  function getMaxCardNumLength (cardType) {
    return cardType === 'amex' ? 17 : 19;
  }

  function isCompleteCardNum (cardNum) {
    var cardType = getCardType(cardNum);
    var maxLength = getMaxCardNumLength(cardType);
    return (''+cardNum).length === maxLength; // Coerce to string just in case
  }
  function isCompleteCVC     (cardNum,CVC) {
    var cardType = getCardType(cardNum);
    var maxLength = cardType === 'amex' ? 4 : 3;
    return (''+CVC).length === maxLength; // Coerce to string just in case
  }
  function isValidLuhn (cardNum) {
    /**
     * Luhn algorithm in JavaScript: validate credit card number supplied as string of numbers
     * @author ShirtlessKirk. Copyright (c) 2012.
     * @license WTFPL (http://www.wtfpl.net/txt/copying)
     */
    // Closure compiled version (updated Feb 11, 2015):
    var luhnChk=function(a){return function(c){for(var l=c.length,b=1,s=0,v;l;)v=parseInt(c.charAt(--l),10),s+=(b^=1)?a[v]:v;return s&&0===s%10}}([0,2,4,6,8,1,3,5,7,9]);
    cardNum += ''; // Coerce to string
    cardNum = cardNum.replace(/ /g,''); // Remove any spaces
    return luhnChk(cardNum);
  }
  function displayErr ($fieldWithErr, $errMsg, opts) {
    $('#'+errMsgDisplayContainer).show();
    $errMsg.show();
    $fieldWithErr.addClass(opts.invalidFieldClass);
  }
  function hideErr ($correctedField, $errMsgToHide, opts) {
    $('#'+errMsgDisplayContainer).hide();
    $errMsgToHide.hide();
    $correctedField.removeClass(opts.invalidFieldClass);
  }



})(jQuery);
