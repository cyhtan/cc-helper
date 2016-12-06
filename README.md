# cc-helper
Simple validation and formatting for credit card fields in payment forms.


## Usage
_Requires jQuery_. Load jQuery first, then `cc-helper.js`. This adds the `CardHelper` constructor function to the global scope. Invoke it as follows:

```javascript
var card = new CardHelper();
```


## Example Usage
```
<form id="myForm" action="">
  <input type="text" name="card-number">
  <input type="text" name="card-cvc">
</form>

<script src="jquery.js"></script>
<script src="cc-helper.js"></script>

<script>
  var card = new CardHelper({
    selectors: {
      form: '#myForm',
    }
  });
</script>

```

## Options
The CardHelper constructor may be passed an options object. Below are the supported options and their default values:

```javascript

var card = new CardHelper({


  /* 
   *  jQuery selector strings used to specify the form and 
   *  relevant fields. 
   *  
   *  inputCardNumber and inputCVC **MUST** be descendants of form.
   *  
   *  The element selected by errMsgDisplay will have a <div>
   *  prepended to it, which will act as a container for all
   *  error messages. Defaults to the value of selectors.form.
   */
  selectors : {
    form            : '#cch-form',
    inputCardNumber : 'input[name="card-number"]',
    inputCVC        : 'input[name="card-cvc"]',
    errMsgDisplay   : selectors.form
  },
  

  /* 
   *  This class will be toggled based on the inputCardNumber 
   *  and inputCVC fields based on validity changes.
   */
  invalidFieldClass : 'cch-invalid-field',
  

  /* 
   *  Whether or not to perform a Luhn validation check,
   *  and display an error while invalid.
   */
  luhnValidation : true,


  /* 
   *  Whether or not to prevent form submission in different
   *  states of invalidity.
   */
  preventSubmitIf     : {
    incompleteCardNum : true,
    incompleteCVC     : true,
    failedLuhn        : true,
  }

  
  /*  
   *  Allows for modification of the value in the inputCardNumber field
   *  prior to submission. Useful if the server requires the card 
   *  number to be presented in a certain format (e.g. without spaces).
   *
   *  If given a callback function, the function will be invoked
   *  during form submission, will be passed the value of the inputCardNumber
   *  field, and will ultimately submit the function's return value as 
   *  the value of that field. Achieves this by creating a hidden clone 
   *  of the original field. 
   *  
   */
  modifyOnSubmit : false,


  /* 
   *  If given a callback function, the function will be invoked
   *  each time the validity of inputCardNumber is changed. It will be
   *  passed true if the value is valid Luhn or of incomplete
   *  length, and false if the value is invalid Luhn.
   */
  onLuhnValidityChange : false,


  /* 
   *  If given a callback function, the function will be invoked
   *  each time the card type has changed. It will be passed a string
   *  expressing the card provider. Possible values are: 'mastercard',
   *  'visa', 'amex', 'discover', or '' if no type is detected.
   */
  onCardTypeChange : false,


  /* 
   *  Whether or not to remove an existing pattern attribute
   *  from inputCardNumber and inputCVC to prevent conflicts.
   */
  removePatternAttr : false,
  

});


```

