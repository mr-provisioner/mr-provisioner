FROM debian:stretch

RUN apt-get update && apt-get install -y vim python3 python3-pip postgresql libpq-dev build-essential libssl-dev curl sudo less gnupg

# Node repo, curl | bash style 😩
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -

# Yarn repo 🚀
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update && apt-get install -y nodejs yarn

WORKDIR /work

ENV APP_DATABASE_URI "postgresql+psycopg2://provuser:provuser@localhost/provisioner"
