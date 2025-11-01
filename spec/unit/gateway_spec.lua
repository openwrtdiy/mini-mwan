--[[
Unit Tests for Gateway Discovery

Requirement: FR-1.3 - Gateway Discovery
Priority: Critical
Description: System SHALL automatically discover gateway addresses for managed interfaces
]]

local mocks = require("spec.helpers.mocks")

-- NOTE: This is a template for when mini-mwan.lua is refactored with dependency injection
-- Current mini-mwan.lua needs to be modified to expose functions and accept dependencies

describe("FR-1.3: Gateway Discovery", function()
	local mini_mwan

	before_each(function()
		-- Reset mocks before each test
		mocks.reset()

		mini_mwan = require("mini-mwan.files.mini-mwan")
	end)

	describe("when interface has default route with gateway", function()
		it("should extract gateway from ifstatus JSON", function()
			-- GIVEN: netifd returns valid gateway info
			local exec_mock = mocks.build_exec_mock({
				["ifstatus eth0"] = mocks.mock_ifstatus_with_gateway("192.168.1.1")
			})

			local deps = mocks.build_deps({ exec = exec_mock })
			mini_mwan.set_dependencies(deps)

			-- WHEN: Getting gateway for eth0
			local gateway = mini_mwan.get_gateway("eth0")

			-- THEN: Should return correct gateway
			assert.equals("192.168.1.1", gateway)
		end)
	end)

	describe("when interface is point-to-point (no gateway)", function()
		it("should return nil without error", function()
			-- GIVEN: P2P interface (VPN tunnel)
			local exec_mock = mocks.build_exec_mock({
				["ifstatus wg0"] = mocks.mock_ifstatus_p2p()
			})

			local deps = mocks.build_deps({ exec = exec_mock })
			mini_mwan.set_dependencies(deps)

			-- WHEN: Getting gateway for wg0
			local gateway = mini_mwan.get_gateway("wg0")

			-- THEN: Should return nil (acceptable for P2P)
			assert.is_nil(gateway)
		end)
	end)

	describe("when ifstatus returns invalid JSON", function()
		it("should log error and return nil", function()
			-- GIVEN: Malformed JSON response
			local exec_mock = mocks.build_exec_mock({
				["ifstatus eth0"] = "{invalid json"
			})

			local deps = mocks.build_deps({ exec = exec_mock })
			mini_mwan.set_dependencies(deps)

			-- WHEN: Getting gateway
			local gateway = mini_mwan.get_gateway("eth0")

			-- THEN: Should handle gracefully
			assert.is_nil(gateway)
		end)
	end)

	describe("when ifstatus returns empty response", function()
		it("should return nil", function()
			-- GIVEN: No output from ifstatus
			local exec_mock = mocks.build_exec_mock({
				["ifstatus eth0"] = ""
			})

			local deps = mocks.build_deps({ exec = exec_mock })
			mini_mwan.set_dependencies(deps)

			-- WHEN: Getting gateway
			local gateway = mini_mwan.get_gateway("eth0")

			-- THEN: Should return nil
			assert.is_nil(gateway)
		end)
	end)

	describe("when multiple routes exist", function()
		it("should extract only default route (0.0.0.0/0)", function()
			-- GIVEN: Multiple routes including default
			local ifstatus_response = [[{
				"route": [
					{
						"target": "192.168.1.0",
						"mask": 24,
						"nexthop": "192.168.1.254"
					},
					{
						"target": "0.0.0.0",
						"mask": 0,
						"nexthop": "192.168.1.1"
					}
				]
			}]]

			local exec_mock = mocks.build_exec_mock({
				["ifstatus eth0"] = ifstatus_response
			})

			local deps = mocks.build_deps({ exec = exec_mock })
			mini_mwan.set_dependencies(deps)

			-- WHEN: Getting gateway
			local gateway = mini_mwan.get_gateway("eth0")

			-- THEN: Should return default route gateway
			assert.equals("192.168.1.1", gateway)
		end)
	end)
end)
