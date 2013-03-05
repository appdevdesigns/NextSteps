#!/bin/bash
if [ ! -d ../encryption ]; then
	echo "Please checkout the TitaniumApps/encryption native module from SVN to proceed with the installation."
fi
TITANIUM_DIR=~/"Library/Application Support/Titanium/"
cp ../encryption/dist/net.appdevdesigns.encryption-android-1.0.zip "$TITANIUM_DIR"
pushd "$TITANIUM_DIR"
curl -O https://raw.github.com/dbankier/CoreTelephony-for-Appcelerator-Titanium/master/com.yydigital.coretelephony-iphone-0.1.zip
popd
