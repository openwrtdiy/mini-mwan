--[[
Mock Helpers for Mini-MWAN Tests

This module provides reusable mocks for testing mini-mwan functionality.
]]

local M = {}

-- Command history tracking
M.executed_commands = {}

-- Reset all mocks to initial state
function M.reset()
	M.executed_commands = {}
end

-- Track executed command
function M.track_command(cmd)
	table.insert(M.executed_commands, cmd)
end

-- Find commands matching pattern
function M.find_commands(pattern)
	local matches = {}
	for _, cmd in ipairs(M.executed_commands) do
		if cmd:match(pattern) then
			table.insert(matches, cmd)
		end
	end
	return matches
end

-- Check if command was executed
function M.was_executed(pattern)
	return #M.find_commands(pattern) > 0
end

-- Get route commands only
function M.get_route_commands()
	return M.find_commands("ip route")
end

-- Mock exec function builder
function M.build_exec_mock(responses)
	--[[
	Build exec mock that returns different responses based on command pattern

	Usage:
		local mock = M.build_exec_mock({
			["ifstatus wan1"] = '{"route":[{"target":"0.0.0.0","nexthop":"192.168.1.1"}]}',
			["ping.*eth0"] = "3 packets transmitted, 3 received",
		})
	]]
	return function(cmd)
		M.track_command(cmd)

		-- Check each pattern
		for pattern, response in pairs(responses) do
			if cmd:match(pattern) then
				return response
			end
		end

		-- Default: return empty string
		return ""
	end
end

-- Mock successful ping response
function M.mock_ping_success(latency)
	latency = latency or 12.5
	return string.format([[
PING 1.1.1.1 (1.1.1.1): 56(84) bytes of data.
64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=%.1f ms
64 bytes from 1.1.1.1: icmp_seq=2 ttl=57 time=%.1f ms
64 bytes from 1.1.1.1: icmp_seq=3 ttl=57 time=%.1f ms
--- 1.1.1.1 ping statistics ---
3 packets transmitted, 3 received, 0%% packet loss, time 2003ms
rtt min/avg/max/mdev = %.1f/%.1f/%.1f/0.5 ms
]], latency, latency, latency, latency-1, latency, latency+1)
end

-- Mock failed ping response
function M.mock_ping_failure()
	return [[
PING 1.1.1.1 (1.1.1.1): 56(84) bytes of data.
--- 1.1.1.1 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2003ms
]]
end

-- Mock ifstatus with gateway
function M.mock_ifstatus_with_gateway(gateway)
	return string.format([[{
	"up": true,
	"pending": false,
	"available": true,
	"route": [
		{
			"target": "0.0.0.0",
			"mask": 0,
			"nexthop": "%s"
		}
	]
}]], gateway)
end

-- Mock ifstatus for P2P interface (no gateway)
function M.mock_ifstatus_shared_medium_interface_without_gateway()
return [[
	{
		"up": true,
		"pending": false,
		"available": true,
		"autostart": true,
		"dynamic": false,
		"uptime": 11,
		"l3_device": "lan1",
		"proto": "static",
		"device": "lan1",
		"updated": [
			"addresses"
		],
		"metric": 0,
		"dns_metric": 0,
		"delegation": true,
		"ipv4-address": [
			{
				"address": "10.0.0.1",
				"mask": 16
			}
		],
		"route": [		],
		"dns-server": [		],
		"dns-search": [		],
		"neighbors": [],
	}
	]]
end
-- Mock ifstatus for P2P interface (no gateway)
function M.mock_ifstatus_p2p()
	return [[{
	"up": true,
	"pending": false,
	"available": true,
	"route": [
		{
			"target": "0.0.0.0",
			"mask": 0
		}
	]
}]]
end

-- Mock interface UP state
function M.mock_interface_up()
	return "3: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP"
end

-- Mock interface DOWN state
function M.mock_interface_down()
	return "3: eth0: <BROADCAST,MULTICAST> mtu 1500 qdisc fq_codel state DOWN"
end

-- Mock UCI cursor
function M.mock_uci_cursor(config_data)
	--[[
	Build UCI cursor mock with predefined config

	Usage:
		local cursor = M.mock_uci_cursor({
			settings = {
				enabled = "1",
				mode = "failover",
				check_interval = "30"
			},
			interfaces = {
				wan1 = { device = "eth0", metric = "1", ... },
				wan2 = { device = "eth1", metric = "2", ... }
			}
		})
	]]
	return {
		load = function(self, name) end,
		get = function(self, config, section, option)
			if config_data[section] then
				return config_data[section][option]
			end
		end,
		foreach = function(self, config, type, callback)
			if type == "interface" and config_data.interfaces then
				for name, data in pairs(config_data.interfaces) do
					local section = {}
					for k, v in pairs(data) do
						section[k] = v
					end
					section['.name'] = name
					callback(section)
				end
			end
		end
	}
end

-- Mock file I/O
function M.mock_file_io()
	local files = {}

	return {
		open = function(path, mode)
			if not files[path] then
				files[path] = {
					content = "",
					closed = false
				}
			end

			local file = files[path]

			return {
				write = function(self, data)
					file.content = file.content .. data
				end,
				read = function(self, format)
					return file.content
				end,
				close = function(self)
					file.closed = true
				end
			}
		end,
		get_content = function(path)
			return files[path] and files[path].content or nil
		end
	}
end

-- Build complete dependency mock
function M.build_deps(overrides)
	--[[
	Build complete dependency object with optional overrides

	Usage:
		local deps = M.build_deps({
			exec = custom_exec_function,
			time = function() return 1234567890 end
		})
	]]
	overrides = overrides or {}

	local deps = {
		exec = overrides.exec or function(cmd)
			M.track_command(cmd)
			return ""
		end,
		sleep = overrides.sleep or function(seconds) end,
		time = overrides.time or function() return 1698765432 end,
		open_file = overrides.open_file or M.mock_file_io().open,
		uci_cursor = overrides.uci_cursor or function()
			return M.mock_uci_cursor({
				settings = { enabled = "1", mode = "failover", check_interval = "30" },
				interfaces = {}
			})
		end
	}

	return deps
end

-- Assertion helpers
function M.assert_route_set(gateway, device, metric)
	--[[
	Assert that a route was set with specific parameters
	]]
	local pattern = string.format("ip route replace default via %s dev %s metric %d",
	                              gateway, device, metric)
	local found = false
	for _, cmd in ipairs(M.executed_commands) do
		if cmd == pattern then
			found = true
			break
		end
	end

	if not found then
		error(string.format("Expected route not found: %s\nExecuted commands:\n%s",
		                   pattern, table.concat(M.executed_commands, "\n")))
	end
end

function M.assert_p2p_route_set(device, metric)
	--[[
	Assert that a P2P route (without gateway) was set
	]]
	local pattern = string.format("ip route replace default dev %s metric %d",
	                              device, metric)
	local found = false
	for _, cmd in ipairs(M.executed_commands) do
		if cmd == pattern then
			found = true
			break
		end
	end

	if not found then
		error(string.format("Expected P2P route not found: %s", pattern))
	end
end

function M.assert_route_deleted(gateway, device)
	--[[
	Assert that a route was deleted
	]]
	local pattern = string.format("ip route delete default via %s dev %s",
	                              gateway, device)
	local found = false
	for _, cmd in ipairs(M.executed_commands) do
		if cmd:match(pattern) then
			found = true
			break
		end
	end

	if not found then
		error(string.format("Expected route delete not found: %s", pattern))
	end
end

return M
