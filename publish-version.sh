#!/bin/sh
# 发布前运行：生成新版本号，写进 index.html 的 ?v= 和 version.json，让手机自动更新
V=$(date +%Y%m%d%H%M)
sed -i '' -E "s#\?v=[0-9]+#?v=$V#g" index.html
printf '{ "version": "%s" }\n' "$V" > version.json
echo "version $V"
