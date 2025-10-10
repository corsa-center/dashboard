# Ruby 3.4 compatibility patch
# The tainted? and untaint methods were removed in Ruby 3.4
# This adds them back as no-ops for backward compatibility

class Object
  unless method_defined?(:tainted?)
    def tainted?
      false
    end
  end

  unless method_defined?(:untaint)
    def untaint
      self
    end
  end

  unless method_defined?(:trust)
    def trust
      self
    end
  end
end
