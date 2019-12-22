npm install -g cordova
cordova create app-mpdova
cd app-mpdova
cordova platform add android
cordova platform add browser
cordova run browser

yum -y install node
npm -g install n
n latest

vi ~/.bash_profile
source ~/.bash_profile

export N_PREFIX=/usr/local/bin/node
export PATH=$N_PREFIX/bin:$PATH
