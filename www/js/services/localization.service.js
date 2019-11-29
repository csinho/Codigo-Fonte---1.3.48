(function () {

  'use strict';

  angular.module('app').factory('LocalizationService', LocalizationService);

  function LocalizationService() {
    var service = {
      getString: getString,
      getDateTimeFormat: getDateTimeFormat,
      getDateFormat:getDateFormat,
      getYearMonthFormat:getYearMonthFormat
    };

    //object with collection of key/strings
    var appStrings = {
      yes: 'Sim',
      no: 'Não',
      cancel: 'Cancelar',
      formsSent: '$0 formulário(s) enviado(s) e $1 formulário(s) enviado(s) anteriormente',
      errorOccurred: 'Ocorreu o seguinte erro:',
      theFollowingErrorOccurred: 'Ocorreu o seguinte erro: $0',
      queryExecuted: 'A consulta foi executada e retornou:',
      syncDownloadExecuted: 'Download de dados concluído com sucesso',
      syncConcludedSuccessfully: 'Sincronização concluída com sucesso',
      deviceCanNotUploadData: 'Não foi possível realizar a sincronização. Verifique se o dispositivo está conectado à Internet. Se estiver conectado e o problema persistir, contate o administrador',
      selectASearchType: 'Selecione um tipo de busca',
      typeAtLeastThreeChars: 'Digite pelo menos 3 caracteres',
      searchError: 'Erro ao realizar busca. Contate o administrador',
      noResultFound: 'Nenhum resultado encontrado',
      getQueryTypeError: 'Erro ao recuperar tipos de consultas. Contate o administrador',
      qrCodeReadingError: 'Erro ao ler código de barras. Tente novamente.',
      saveFormWithUnopenedSections: 'Algumas seções do formulário não foram abertas. Deseja salvar mesmo assim?',
      formSaved: 'Formulário salvo com sucesso',
      formNotValid: 'O formulário não está válido',
      formSavedDoYouWantToAssociateAQRCode: 'Formulário salvo. Deseja associar um código QR ao formulário?',
      formSavedAsDraftdoYouWantToAssociateAQRCode: 'Formulário salvo como rascunho. Deseja associar um código QR ao formulário?',
      associateQRCode: 'Associar Código QR',
      confirmation: 'Confirmação',
      youMustSync: 'Conecte à internet e sincronize seu dispositivo para continuar utilizando a aplicação',
      couldNotRegisterDevice: 'Falha ao tentar registrar. Verifique a conexão com a internet',
      authenticate: 'Autenticado com sucesso',
      authenticatingDevice: 'Autenticando Dispositivo...',
      errorWhileAuthenticating: 'Erro ao tentar autenticar/validar. Tente novamente mais tarde.',
      startedUploading: 'Envio de dados iniciado. Aguarde...',
      startedSyncing: 'Sincronização iniciada. Aguarde...',
      startedDownloading: 'Recebimento de dados iniciado. Aguarde...',
      waitTheCurrentSyncingFinish: 'Aguarde a sincronização atual terminar',
      thisDeviceIsNotAuthorized: 'Este dspositivo não está autorizado ou a versão está desatualizada. Solicite autorização ou verifique com o gestor.',
      theQRCodeCouldNotBeRead: 'Não foi possível ler o  código QR. Tente novamente',
      qrCodeAssociated: 'Código QR associado',
      qrCodeAssociatedSuccessfully: 'Código QR associado com sucesso',
      theQRCodeCouldNotBeAssociatedTryAgain: 'O código QR não pode ser associado. Tente novamente.',
      qrCodeDefined: 'Código QR definido. Os formulários cadastrados serão automaticamente associados a esse código.',
      associatingQRCodeTo: 'Associando código QR a:',
      readTheQRCodetoStartASession: 'Leia o código para iniciar uma sessão de cadastro de formulários',
      itWastNotPossibleToLoadTheForm: 'Não foi possível carregar o formulário.',
      minMultiQuantity:"A quantidade informada deve ser no mínimo a quantidade de itens selecionados",
      itemAlreadyAssociated:'Item já associado. Escolha outra opção.',
      typeASearchTerm:'Digite um termo para buscar',
      searchResults:'Resultados da busca:',
      formSavedAsDraft:'O formulário não foi preenchido completamente e foi salvo como rascunho',
      draft:'Rascunho',
      completed:'Concluído',
      theSearchResultWillBeShowBelow:'O resultado será exibido abaixo',
      invalidDataCheckTheInputs:'Dados inválidos. Verifique os campos.',
      sessionSuccessfulyFilled:'Seção preenchida com sucesso.',
      typeUndefined:'Tipo não definido',
      statusUndefined:'Estado não definido',
      deletingOldFormVersion:'Excluindo versão anterior do formulário',
      associationOf:'Associação de ',
      searchRegistry:'Buscar cadastro',
      search:'Busca',
      toSearch:'Buscar',
      registry:'cadastro',
      theSelectedItemMustHaveTheAValidValueIntheField:'O item selecionado deve ter o campo $0 com um valor válido.',
      lastRegistries:'Formulários mais recentes',
      searching:'Pesquisando',
      sync:'Sincronizar',
      fullSync:'Sincronização completa',
      syncing:'Sincronizando',
      toSaveAnAssociatedFormItsMandatoryFieldsMustBeCompleted:'Para concluir a associação todos as seções obrigatórias devem estar preenchidas',
      onlyCompletedsFormsAreBeingListed :'Listando somente formulários que foram completados',
      noCompletedFormOfThisTypeRegistered :'Não foram encontrados formulários desse tipo que tenham sido completados',
      itWasNotPossibletoGetTheServerTime:'Não foi possível obter a data do servidor',
      insertingExternalDataInLocalDataBase:'Inserindo dados externos no banco de dados local',
      obtainingExternalData:'Obtendo dados externos',
      validatingAppVersion:'Validando versão da aplicação...',
      lat:'latitude',
      long:'longitude',
      alt:'altitude',
      acquiringPositionError:'Não foi possível capturar a localização. Verifique se o GPS está ativo e se o dispositivo está a céu aberto',
      locationHasNotChanged:'Não foi detectada mudança de localização',
      notCapturedYet:'Ainda não capturada',
      acquiringPosition:'Capturando posição...',
      coordinates:'coordenadas',
      fullSyncWarning:'A sincronização completa, além de tudo que a convencional realiza, baixa formulários do servidor que não foram cadastrados nesse dispositivo mas estão associados ao seu usuário',
      youMustAssociateAQRCode:'Você deve associar um código QR',
      loadingForm:'Carregando formulário...',
      dissociationSavedSucessfuly:'Desassociação salva com sucesso',
      associationSavedSucessfuly:'Associação salva com sucesso',
      errorWhileValidatingLocalDate:'A data/hora e/ou o fuso horário do seu dispositivo está(ão) incorreto(s). Ajuste, feche e reabra o aplicativo',
      noInternetConnection:'Seu dispositivo não tem uma conexão funcional com a internet. É necessário estar online para acessar esse recurso',
      noConnection:'Sem conexão',
      notInformed:'Não informado(a)'
    };

    /**
     * Get a specified string and replaces the parameters with the given one
     * @param  {} key
     * @param  string|[] replacements
     */
    function getString(key, replacements) {
      var value = appStrings[key];
      if (replacements) {
        if (Array.isArray(replacements)) {
          angular.forEach(replacements, function (replacement, index) {
            var replacePlaceHolder = '$' + index;
            value = value.replace(replacePlaceHolder, replacement);
          });
        }
        else {
          value = value.replace('$0', replacements);
        }
      }
      return value;
    }

    function getDateFormat() {
      return 'dd/MM/yyyy';
    }

    function getDateTimeFormat() {
      return 'dd/MM/yyyy H:mm';
    }

    function getYearMonthFormat(){
      return 'MM/yyyy';
    }

    return service;
  }

})();


