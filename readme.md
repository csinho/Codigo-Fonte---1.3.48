#Sobre

- Projeto Mobile do MACS.
- O mesmo utiliza ionic 1.2. 

## Pré requisitos

- linux (preferência ubuntu)
- sdk do android
- node versão 4 ou superior [tutorial para instalar](https://nodejs.org/en/download/package-manager/)
- editor descente [atom.io](https://atom.io/)
- dúvidas sobre configurações do ambiente ionic podem ser encontradas [aqui](http://ionicframework.com/docs/guide/installation.html)

## Ambiente de desenvolvimento

> abra o terminal e rode os comandos abaixo

- git clone url-do-repositório
- cd MACS
- npm install -g cordova ionic
- ionic platform add android
- ionic serve (roda no navegador)
- ionic android run (roda no device ou emulador)

## Gerar APK para Liberação

> liberação

- cordova build --release android
- jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore android-release-unsigned.apk alias_name
- zipalign -v 4 android-release-unsigned.apk release.apk

