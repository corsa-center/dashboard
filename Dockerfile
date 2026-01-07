FROM ruby:2.7

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /site

# Copy Gemfile
COPY Gemfile* ./

# Install gems
RUN bundle install

# Expose Jekyll port
EXPOSE 4000

# Start Jekyll server
CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--port", "4000", "--livereload"]
