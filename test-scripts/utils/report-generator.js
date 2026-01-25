/**
 * Report Generator Utility
 * Generates comprehensive markdown test reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ReportGenerator {
  constructor(testResults) {
    this.results = testResults;
  }

  /**
   * Generate markdown report
   * @param {string} outputPath - Path to save report
   * @returns {string} Report content
   */
  generate(outputPath) {
    const sections = [
      this.generateHeader(),
      this.generateExecutiveSummary(),
      this.generateServiceHealthSection(),
      this.generateAuthenticationSection(),
      this.generateHomepageEndpointsSection(),
      this.generateProductPageEndpointsSection(),
      this.generateUserFlowsSection(),
      this.generateFailuresAndFixesSection(),
      this.generatePerformanceMetrics(),
      this.generateRecommendations(),
      this.generateTestDataSection(),
      this.generateAppendix()
    ];

    const report = sections.join('\n\n---\n\n');

    // Ensure reports directory exists
    const reportsDir = path.dirname(outputPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Write report
    fs.writeFileSync(outputPath, report, 'utf-8');

    console.log(`\n📄 Report generated: ${outputPath}\n`);

    return report;
  }

  /**
   * Generate header section
   */
  generateHeader() {
    const timestamp = new Date().toISOString();
    const duration = this.results.totalDuration || 0;
    const durationMin = Math.floor(duration / 60000);
    const durationSec = Math.floor((duration % 60000) / 1000);

    return `# Comprehensive Endpoint Test Report

**Generated:** ${timestamp}
**Duration:** ${durationMin}m ${durationSec}s
**Gateway:** ${this.results.gatewayUrl || 'http://localhost:3000'}
**Test Suite:** Cleanse Ayurveda Microservices API Testing`;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary() {
    const stats = this.calculateStatistics();

    return `## Executive Summary

- **Total Endpoints Tested:** ${stats.totalTests}
- **Passed:** ${stats.passed} (${stats.passRate}%)
- **Failed:** ${stats.failed} (${stats.failRate}%)
- **Auto-Fixed:** ${stats.autoFixed}
- **Requires Manual Fix:** ${stats.manualFixRequired}
- **Overall Success Rate:** ${stats.passRate}%`;
  }

  /**
   * Generate service health section
   */
  generateServiceHealthSection() {
    const services = this.results.serviceHealth || [];

    let table = `## Service Health Status

| Service | Port | Status | Response Time | Issues |
|---------|------|--------|---------------|--------|`;

    services.forEach(svc => {
      const status = svc.isHealthy ? '✓' : '✗';
      const responseTime = svc.duration ? `${svc.duration}ms` : 'N/A';
      const issues = svc.error || 'None';

      table += `\n| ${svc.serviceName} | ${svc.port} | ${status} | ${responseTime} | ${issues} |`;
    });

    return table;
  }

  /**
   * Generate authentication section
   */
  generateAuthenticationSection() {
    const auth = this.results.authentication || {};

    return `## Authentication Status

- ${auth.admin ? '✓' : '✗'} Admin Token Obtained
- ${auth.consumer ? '✓' : '✗'} Consumer Token Valid
- ${auth.guest ? '✓' : '✗'} Guest Session Created`;
  }

  /**
   * Generate homepage endpoints section
   */
  generateHomepageEndpointsSection() {
    const tests = this.results.homepageTests || [];

    let content = `## Homepage Endpoints

**Total Tests:** ${tests.length}
**Passed:** ${tests.filter(t => t.passed).length}
**Failed:** ${tests.filter(t => !t.passed).length}

### Test Results

| # | Endpoint | Method | Status | Response Time | Data Quality | Issues |
|---|----------|--------|--------|---------------|--------------|--------|`;

    tests.forEach((test, index) => {
      const status = test.passed ? '✓' : '✗';
      const responseTime = test.duration ? `${test.duration}ms` : 'N/A';
      const dataQuality = test.dataQuality || 'N/A';
      const issues = test.error || 'None';

      content += `\n| ${index + 1} | ${test.endpoint} | ${test.method} | ${status} | ${responseTime} | ${dataQuality} | ${issues} |`;
    });

    return content;
  }

  /**
   * Generate product page endpoints section
   */
  generateProductPageEndpointsSection() {
    const tests = this.results.productPageTests || [];

    let content = `## Product Page Endpoints

**Total Tests:** ${tests.length}
**Passed:** ${tests.filter(t => t.passed).length}
**Failed:** ${tests.filter(t => !t.passed).length}

### Test Results

| # | Endpoint | Method | Status | Response Time | Data Quality | Issues |
|---|----------|--------|--------|---------------|--------------|--------|`;

    tests.forEach((test, index) => {
      const status = test.passed ? '✓' : '✗';
      const responseTime = test.duration ? `${test.duration}ms` : 'N/A';
      const dataQuality = test.dataQuality || 'N/A';
      const issues = test.error || 'None';

      content += `\n| ${index + 1} | ${test.endpoint} | ${test.method} | ${status} | ${responseTime} | ${dataQuality} | ${issues} |`;
    });

    return content;
  }

  /**
   * Generate user flows section
   */
  generateUserFlowsSection() {
    const flows = this.results.userFlows || [];

    let content = `## User Flow Tests

**Total Flows:** ${flows.length}
**Passed:** ${flows.filter(f => f.passed).length}
**Failed:** ${flows.filter(f => !f.passed).length}

### Flow Results

| Flow Name | Steps | Status | Duration | Issues |
|-----------|-------|--------|----------|--------|`;

    flows.forEach(flow => {
      const status = flow.passed ? '✓' : '✗';
      const duration = flow.duration ? `${flow.duration}ms` : 'N/A';
      const issues = flow.error || 'None';

      content += `\n| ${flow.name} | ${flow.steps || 0} | ${status} | ${duration} | ${issues} |`;
    });

    return content;
  }

  /**
   * Generate failures and fixes section
   */
  generateFailuresAndFixesSection() {
    const failures = this.results.failures || [];

    if (failures.length === 0) {
      return `## Failures & Fixes Applied

**No failures detected!** All endpoints passed successfully.`;
    }

    let content = `## Failures & Fixes Applied

**Total Issues:** ${failures.length}
**Auto-Fixed:** ${failures.filter(f => f.fixed).length}
**Manual Fix Required:** ${failures.filter(f => !f.fixed).length}

### Issue Details
`;

    failures.forEach((failure, index) => {
      content += `
#### ${index + 1}. ${failure.title || 'Unnamed Issue'}

- **Endpoint:** ${failure.endpoint}
- **Method:** ${failure.method}
- **Error:** ${failure.error}
- **HTTP Status:** ${failure.status}
- **Root Cause:** ${failure.rootCause || 'Not determined'}
- **Fix Applied:** ${failure.fix || 'None'}
- **Status:** ${failure.fixed ? '✓ Fixed' : '⚠️  Requires Manual Fix'}
- **Re-test Result:** ${failure.retestPassed ? 'Pass ✓' : failure.retested ? 'Still Failing ✗' : 'Not Re-tested'}
`;
    });

    return content;
  }

  /**
   * Generate performance metrics section
   */
  generatePerformanceMetrics() {
    const allTests = [
      ...(this.results.homepageTests || []),
      ...(this.results.productPageTests || [])
    ];

    if (allTests.length === 0) {
      return `## Performance Metrics

No performance data available.`;
    }

    const durations = allTests.filter(t => t.duration).map(t => t.duration);
    const avgResponseTime = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    const slowest = allTests.reduce((prev, curr) =>
      (curr.duration > prev.duration) ? curr : prev, { duration: 0 });

    const fastest = allTests.reduce((prev, curr) =>
      (curr.duration > 0 && curr.duration < prev.duration) ? curr : prev, { duration: Infinity });

    return `## Performance Metrics

- **Average Response Time:** ${avgResponseTime}ms
- **Slowest Endpoint:** ${slowest.endpoint || 'N/A'} (${slowest.duration}ms)
- **Fastest Endpoint:** ${fastest.endpoint || 'N/A'} (${fastest.duration === Infinity ? 'N/A' : fastest.duration + 'ms'})
- **Endpoints > 2s:** ${durations.filter(d => d > 2000).length}
- **Endpoints > 1s:** ${durations.filter(d => d > 1000).length}`;
  }

  /**
   * Generate recommendations section
   */
  generateRecommendations() {
    const recommendations = this.results.recommendations || [];

    if (recommendations.length === 0) {
      return `## Recommendations

No specific recommendations. System is functioning well.`;
    }

    let content = `## Recommendations\n`;

    recommendations.forEach((rec, index) => {
      content += `\n${index + 1}. **${rec.priority}:** ${rec.text}`;
    });

    return content;
  }

  /**
   * Generate test data section
   */
  generateTestDataSection() {
    const seedData = this.results.seedData || {};

    return `## Test Data Created

The following test data was created for comprehensive testing:

- **Categories:** ${seedData.categories?.length || 0}
- **Products:** ${seedData.products?.length || 0}
- **Product Variants:** ${seedData.variants?.length || 0}
- **Bundles:** ${seedData.bundles?.length || 0}
- **Blogs:** ${seedData.blogs?.length || 0}
- **Testimonials:** ${seedData.testimonials?.length || 0}
- **Banners:** ${seedData.banners?.length || 0}
- **Reels:** ${seedData.reels?.length || 0}
- **Popups:** ${seedData.popups?.length || 0}
- **Pages:** ${seedData.pages?.length || 0}
- **Navigation Menus:** ${seedData.navigation?.length || 0}
- **Reviews:** ${seedData.reviews?.length || 0}`;
  }

  /**
   * Generate appendix
   */
  generateAppendix() {
    const sampleTests = this.results.homepageTests?.slice(0, 2) || [];

    let content = `## Appendix

### Sample Test Requests

`;

    sampleTests.forEach(test => {
      if (test.request) {
        content += `#### ${test.endpoint}\n\n`;
        content += '```http\n';
        content += `${test.method} ${test.endpoint}\n`;
        if (test.request.headers) {
          Object.entries(test.request.headers).forEach(([key, value]) => {
            content += `${key}: ${value}\n`;
          });
        }
        if (test.request.body) {
          content += `\n${JSON.stringify(test.request.body, null, 2)}\n`;
        }
        content += '```\n\n';
      }

      if (test.response) {
        content += '**Response:**\n\n';
        content += '```json\n';
        content += JSON.stringify(test.response, null, 2);
        content += '\n```\n\n';
      }
    });

    return content;
  }

  /**
   * Calculate statistics
   */
  calculateStatistics() {
    const allTests = [
      ...(this.results.homepageTests || []),
      ...(this.results.productPageTests || [])
    ];

    const totalTests = allTests.length;
    const passed = allTests.filter(t => t.passed).length;
    const failed = totalTests - passed;
    const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;
    const failRate = 100 - passRate;

    const failures = this.results.failures || [];
    const autoFixed = failures.filter(f => f.fixed).length;
    const manualFixRequired = failures.filter(f => !f.fixed).length;

    return {
      totalTests,
      passed,
      failed,
      passRate,
      failRate,
      autoFixed,
      manualFixRequired
    };
  }

  /**
   * Generate console summary
   */
  printConsoleSummary() {
    const stats = this.calculateStatistics();

    console.log('\n' + '='.repeat(60));
    console.log('  TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total Endpoints Tested: ${stats.totalTests}`);
    console.log(`  Passed: ${stats.passed} (${stats.passRate}%)`);
    console.log(`  Failed: ${stats.failed} (${stats.failRate}%)`);
    console.log(`  Auto-Fixed: ${stats.autoFixed}`);
    console.log(`  Manual Fixes Required: ${stats.manualFixRequired}`);
    console.log('='.repeat(60) + '\n');
  }
}

export default ReportGenerator;
