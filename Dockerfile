FROM golang:1.23 AS build

WORKDIR /app

COPY . .

RUN go build -o main /app/cmd/server/main.go

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/main /app/main

COPY --from=build /app/templates /app/templates

COPY --from=build /app/static /app/static
EXPOSE 8080

CMD [ "./main" ]