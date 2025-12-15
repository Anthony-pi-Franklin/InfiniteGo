# Use the official Golang image as a base
FROM golang:1.20

# Set the working directory inside the container
WORKDIR /app

# Copy the Go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the Go application
RUN go build -o server ./cmd/main.go

# Expose the port the server will run on
EXPOSE 8080

# Command to run the server
CMD ["./server"]