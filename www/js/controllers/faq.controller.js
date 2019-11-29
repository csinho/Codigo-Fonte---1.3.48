(function() {

  'use strict';

  angular
    .module('app')
    .controller('FAQController', FAQController);

  FAQController.$inject = [];

  function FAQController() {
    var vm = this;

    vm.toggle = toggle;

    activate();

    function activate() {

      vm.faqs = [
        { show: false, id: 1, pergunta: 'O que é o MACS e como ele atua?', resposta: 'É um órgão administrativo que tem como '}
      ];

    }

    function toggle(faq) {
      faq.show = !faq.show;
    }
  }

})();
