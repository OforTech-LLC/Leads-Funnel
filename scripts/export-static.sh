#!/bin/bash
# Export static files from Next.js build for S3 deployment
set -e

APP_DIR="$1"
if [ -z "$APP_DIR" ]; then
    echo "Usage: $0 <app-directory>"
    echo "Example: $0 apps/admin"
    exit 1
fi

cd "$APP_DIR"

if [ ! -d ".next" ]; then
    echo "Error: .next directory not found. Run 'npm run build' first."
    exit 1
fi

# Clean and create output directory
rm -rf out
mkdir -p out

# Copy static assets
if [ -d ".next/static" ]; then
    mkdir -p out/_next/static
    cp -r .next/static/* out/_next/static/
fi

# Copy HTML files from server/app
find .next/server/app -name "*.html" | while read -r html_file; do
    # Get relative path from .next/server/app
    rel_path="${html_file#.next/server/app/}"

    # Handle index.html -> /index.html
    if [ "$rel_path" = "index.html" ]; then
        cp "$html_file" out/index.html
        mkdir -p out/index
        cp "$html_file" out/index/index.html
    # Handle route.html -> /route/index.html
    elif [[ "$rel_path" == *.html ]]; then
        route_name="${rel_path%.html}"
        # Skip _not-found and _global-error at root
        if [[ "$route_name" != "_"* ]]; then
            mkdir -p "out/${route_name}"
            cp "$html_file" "out/${route_name}/index.html"
        fi
    fi
done

# Copy 404 page
if [ -f ".next/server/app/_not-found.html" ]; then
    cp .next/server/app/_not-found.html out/404.html
    mkdir -p out/404
    cp .next/server/app/_not-found.html out/404/index.html
fi

# Copy _not-found directory structure
if [ -d ".next/server/app/_not-found" ]; then
    mkdir -p out/_not-found
    if [ -f ".next/server/app/_not-found.html" ]; then
        cp .next/server/app/_not-found.html out/_not-found/index.html
    fi
fi

# Copy _global-error
if [ -f ".next/server/app/_global-error.html" ]; then
    mkdir -p out/_global-error
    cp .next/server/app/_global-error.html out/_global-error/index.html
fi

echo "Static export complete: $APP_DIR/out"
ls -la out/
