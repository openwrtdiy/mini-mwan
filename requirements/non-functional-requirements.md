# Non-Functional Requirements

## NFR-1: Performance

### NFR-1.1 Resource Footprint
**ID**: NFR-1.1
**Priority**: High
**Description**: The system SHALL minimize resource consumption for embedded router environments.

**Acceptance Criteria**:
- Memory usage SHOULD NOT exceed 5MB RAM under normal operation
- CPU usage SHOULD remain below 5% on typical OpenWrt hardware (MIPS/ARM routers)
- Daemon MUST remain idle between check intervals (not busy-waiting)

### NFR-1.2 Response Time
**ID**: NFR-1.2
**Priority**: High
**Description**: The system SHALL respond to interface failures within defined timeframes.

**Acceptance Criteria**:
- Failover detection MUST occur within one `check_interval` (default 30s)
- Route updates MUST complete within 1 second of detection
- Configuration reload MUST complete within 5 seconds

### NFR-1.3 Scalability
**ID**: NFR-1.3
**Priority**: Medium
**Description**: The system SHALL support reasonable numbers of interfaces.

**Acceptance Criteria**:
- System MUST support at least 4 WAN interfaces
- System SHOULD support up to 8 WAN interfaces
- Performance MUST NOT degrade significantly with more interfaces

### NFR-1.4 Network Overhead
**ID**: NFR-1.4
**Priority**: Medium
**Description**: The system SHALL minimize bandwidth consumption for monitoring.

**Acceptance Criteria**:
- Ping tests SHOULD use minimal packet sizes (default ICMP)
- Monitoring traffic SHOULD NOT exceed 1KB/interface/check
- Failed interfaces SHOULD NOT generate excessive retry traffic

---

## NFR-2: Reliability

### NFR-2.1 Availability
**ID**: NFR-2.1
**Priority**: Critical
**Description**: The daemon MUST remain operational continuously.

**Acceptance Criteria**:
- Uptime MUST exceed 99% under normal conditions
- Daemon MUST NOT crash due to network errors
- Daemon MUST NOT crash due to configuration errors
- All errors MUST be caught and logged gracefully

### NFR-2.2 Fault Tolerance
**ID**: NFR-2.2
**Priority**: High
**Description**: The system SHALL handle error conditions gracefully.

**Error Scenarios**:
- Missing network interfaces → Log and mark as `interface_down`
- Failed ping commands → Mark interface as `down`
- Invalid JSON from netifd → Log error, use nil gateway
- File I/O failures → Log error, continue operation
- Command execution failures → Log error, continue operation

### NFR-2.3 State Consistency
**ID**: NFR-2.3
**Priority**: High
**Description**: The system SHALL maintain consistent state across operations.

**Acceptance Criteria**:
- Routing table MUST accurately reflect interface status
- Status file MUST reflect actual interface states
- State persistence MUST prevent data loss during reloads
- No race conditions between monitoring cycles

### NFR-2.4 Recovery
**ID**: NFR-2.4
**Priority**: High
**Description**: The system SHALL automatically recover from failures.

**Acceptance Criteria**:
- Failed interfaces SHALL be continuously monitored for recovery
- Recovered interfaces SHALL be automatically re-added to routing
- Degraded interfaces SHALL automatically recover when gateway appears
- No manual intervention required for recovery

---

## NFR-3: Maintainability

### NFR-3.1 Code Quality
**ID**: NFR-3.1
**Priority**: Medium
**Description**: The codebase SHALL be maintainable and readable.

**Acceptance Criteria**:
- Code MUST pass luacheck static analysis with minimal warnings
- Functions SHOULD be single-purpose and focused
- Code SHOULD include comments for complex logic
- No code duplication for common operations

### NFR-3.2 Modularity
**ID**: NFR-3.2
**Priority**: Medium
**Description**: The system SHALL be organized into logical functional units.

**Acceptance Criteria**:
- Clear separation between monitoring, routing, and configuration
- Helper functions for reusable operations
- Mode handlers (failover/multiuplink) as separate functions
- Minimal global state

### NFR-3.3 Debuggability
**ID**: NFR-3.3
**Priority**: High
**Description**: The system SHALL provide sufficient information for troubleshooting.

**Acceptance Criteria**:
- All state changes MUST be logged
- Audit mode SHALL log all system commands
- Status file SHALL provide real-time visibility
- Error messages MUST include context (interface name, command, etc.)

### NFR-3.4 Configuration Simplicity
**ID**: NFR-3.4
**Priority**: High
**Description**: Configuration SHALL be straightforward and well-documented.

**Acceptance Criteria**:
- All configuration options MUST have sensible defaults
- Configuration validation MUST provide clear error messages
- Example configuration MUST be provided
- Required vs optional parameters MUST be clearly documented

---

## NFR-4: Compatibility

### NFR-4.1 OpenWrt Integration
**ID**: NFR-4.1
**Priority**: Critical
**Description**: The system SHALL integrate seamlessly with OpenWrt ecosystem.

**Acceptance Criteria**:
- MUST use UCI for configuration (standard OpenWrt approach)
- MUST use procd for process management
- MUST follow OpenWrt init script conventions
- MUST use standard OpenWrt log locations
- MUST NOT conflict with other OpenWrt services

### NFR-4.2 Interface Type Support
**ID**: NFR-4.2
**Priority**: High
**Description**: The system SHALL support common WAN interface types.

**Supported Interface Types**:
- Ethernet interfaces (eth0, eth1, etc.)
- WireGuard tunnels (wg0, wg1, etc.)
- OpenVPN tunnels (tun0, tun1, etc.)
- PPP/PPPoE connections (ppp0, pppoe-wan, etc.)
- VLAN interfaces (eth0.2, etc.)
- USB modems (usb0, wwan0, etc.)

**Acceptance Criteria**:
- No hardcoded assumptions about interface naming
- Both gateway-based and P2P interfaces supported
- Physical and virtual interfaces supported

### NFR-4.3 Kernel Requirements
**ID**: NFR-4.3
**Priority**: High
**Description**: The system SHALL work with standard Linux kernel routing features.

**Acceptance Criteria**:
- MUST use standard iproute2 `ip route` commands
- Multipath routing MUST use kernel multipath features
- MUST work with Linux kernel 3.18+ (OpenWrt minimum)

### NFR-4.4 Lua Version
**ID**: NFR-4.4
**Priority**: Critical
**Description**: The system SHALL be compatible with Lua versions available on OpenWrt.

**Acceptance Criteria**:
- MUST work with Lua 5.1 (standard on OpenWrt)
- SHOULD work with Lua 5.3+ for future compatibility
- MUST NOT use Lua features unavailable on OpenWrt

---

## NFR-5: Security

### NFR-5.1 Privilege Level
**ID**: NFR-5.1
**Priority**: Critical
**Description**: The daemon SHALL run with appropriate privileges.

**Acceptance Criteria**:
- Daemon MUST run as root (required for routing table manipulation)
- File permissions MUST prevent unauthorized modification
- Configuration file MUST be readable only by root

### NFR-5.2 Input Validation
**ID**: NFR-5.2
**Priority**: High
**Description**: The system SHALL validate all inputs.

**Acceptance Criteria**:
- UCI configuration values MUST be validated before use
- Network interface names MUST be sanitized
- IP addresses MUST be validated
- No shell injection vulnerabilities in command construction

### NFR-5.3 Audit Trail
**ID**: NFR-5.3
**Priority**: Medium
**Description**: The system SHALL provide audit capabilities for security compliance.

**Acceptance Criteria**:
- Audit mode MUST log all system modifications
- Logs MUST include timestamps
- Logs MUST be tamper-evident (append-only)

### NFR-5.4 Information Disclosure
**ID**: NFR-5.4
**Priority**: Medium
**Description**: The system SHALL NOT disclose sensitive information.

**Acceptance Criteria**:
- Logs MUST NOT contain passwords or keys
- Status file MAY be world-readable (no sensitive data)
- Error messages MUST NOT reveal system internals

---

## NFR-6: Usability

### NFR-6.1 Operational Simplicity
**ID**: NFR-6.1
**Priority**: High
**Description**: The system SHALL be simple to operate.

**Acceptance Criteria**:
- Default configuration SHOULD work for common scenarios
- Service control MUST use standard OpenWrt commands
- Status MUST be easily queryable via status file
- No complex setup procedures required

### NFR-6.2 Observability
**ID**: NFR-6.2
**Priority**: High
**Description**: System behavior SHALL be easily observable.

**Acceptance Criteria**:
- Current status MUST be visible in status file
- Logs MUST be human-readable
- Interface states MUST be clearly reported
- Active routing mode MUST be logged

### NFR-6.3 Error Messages
**ID**: NFR-6.3
**Priority**: Medium
**Description**: Error messages SHALL be clear and actionable.

**Acceptance Criteria**:
- Errors MUST indicate what failed
- Errors SHOULD indicate why it failed
- Errors SHOULD suggest corrective action when possible
- Errors MUST include relevant context (interface name, command, etc.)

---

## NFR-7: Portability

### NFR-7.1 Architecture Independence
**ID**: NFR-7.1
**Priority**: Medium
**Description**: The system SHALL work across different CPU architectures.

**Acceptance Criteria**:
- MUST work on MIPS (common OpenWrt architecture)
- MUST work on ARM/ARM64 (modern routers)
- MUST work on x86/x86_64 (PC-based routers)
- No architecture-specific code or assumptions

### NFR-7.2 OpenWrt Version Compatibility
**ID**: NFR-7.2
**Priority**: High
**Description**: The system SHALL support recent OpenWrt versions.

**Acceptance Criteria**:
- MUST work on OpenWrt 21.02+
- SHOULD work on OpenWrt 19.07+ (best effort)
- Forward compatibility with new OpenWrt releases preferred

---

## NFR-8: Testability

### NFR-8.1 Unit Testing
**ID**: NFR-8.1
**Priority**: Low
**Description**: Code SHOULD be structured to allow unit testing.

**Acceptance Criteria**:
- Functions SHOULD be pure where possible (no side effects)
- External dependencies (exec, UCI) SHOULD be mockable
- Business logic SHOULD be separate from I/O

### NFR-8.2 Integration Testing
**ID**: NFR-8.2
**Priority**: Medium
**Description**: The system SHOULD support integration testing.

**Acceptance Criteria**:
- Test mode flag to prevent actual route changes
- Dry-run mode for command logging without execution
- Status output should be machine-parseable

### NFR-8.3 Field Testing
**ID**: NFR-8.3
**Priority**: High
**Description**: The system SHALL provide tools for field testing.

**Acceptance Criteria**:
- Audit mode for troubleshooting deployments
- Verbose logging available without code changes
- Status file for external monitoring integration
