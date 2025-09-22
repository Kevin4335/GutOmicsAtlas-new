all:
	echo "Please do not use make directly!"
	exit 1

server:
	rm -rf webserver
	mkdir webserver
	cp -r html webserver
	cp -r css webserver
	cp -r js webserver
	cp -r imgs webserver
	cp ./*.py webserver
	rm -rf webserver/js-build
