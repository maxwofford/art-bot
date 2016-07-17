FROM node:5-onbuild

WORKDIR /app/src
EXPOSE 3000
ENV PORT 3000

RUN npm install

CMD npm start
