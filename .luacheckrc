-- Luacheck configuration for Mini-MWAN project

std = "lua54"

-- Global settings
max_line_length = 120
codes = true

-- Ignore warnings about unused arguments starting with underscore
unused_args = false
self = false

-- Files and directories to exclude
exclude_files = {
    ".luarocks/*",
    "luacov-html/*"
}

-- Busted testing framework globals
files["spec/**/*.lua"] = {
    std = "+busted",
    globals = {
        "describe",
        "it",
        "pending",
        "before_each",
        "after_each",
        "setup",
        "teardown",
        "assert",
        "spy",
        "stub",
        "mock"
    }
}

-- Mini-MWAN source files
files["mini-mwan/files/*.lua"] = {
    globals = {
        "os",
        "io",
        "require",
        "pcall",
        "tonumber",
        "tostring",
        "ipairs",
        "pairs",
        "table",
        "string",
        "math"
    }
}
