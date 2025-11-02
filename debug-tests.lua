#!/usr/bin/lua

-- set up luarocks paths and context
package.path = "/Users/slavibor/.luarocks/share/lua/5.4/?.lua;/Users/slavibor/.luarocks/share/lua/5.4/?/init.lua;" .. package.path
package.cpath = "/Users/slavibor/.luarocks/lib/lua/5.4/?.so;" .. package.cpath
pcall(require, "luarocks.loader") -- ignore errors if already configured

-- run busted runner file (use loadfile if it's pure Lua)
local runner = assert(loadfile("/Users/slavibor/.luarocks/lib/luarocks/rocks-5.4/busted/2.2.0-1/bin/busted"))
runner(table.unpack({}))
