#!/bin/sh

base=$(cd "$(dirname "$0")"; pwd)
cd $base

nohup anyproxy -i --port 8001 --rule rule_sample.js &
