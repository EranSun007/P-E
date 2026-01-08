#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeBundleFiles, formatBytes } from './bundle-analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bundle Monitoring Dashboard
 * Provides real-time monitoring and historical tracking of bundle sizes
 */

class BundleMonitor {
  constructor() {
    this.historyFile = path.resolve(__dirname, '../.bundle-history.json');
    this.alertsFile = path.resolve(__dirname, '../.bundle-alerts.json');
    this.thresholds = {
      maxChunkSize: 400 * 1024, // 400 KB
      maxInitialBundle: 300 * 1024, // 300 KB
      maxTotalSize: 2 * 1024 * 1024, // 2 MB
      warningThreshold: 0.9 // 90% of limit triggers warning
    };
  }

  loadHistory() {
    if (!fs.existsSync(this.historyFile)) {
      return [];
    }
    try {
      const data = fs.readFileSync(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️  Could not load bundle history:', error.message);
      return [];
    }
  }

  saveHistory(history) {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('❌ Could not save bundle history:', error.message);
    }
  }

  loadAlerts() {
    if (!fs.existsSync(this.alertsFile)) {
      return [];
    }
    try {
      const data = fs.readFileSync(this.alertsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️  Could not load alerts:', error.message);
      return [];
    }
  }

  saveAlerts(alerts) {
    try {
      fs.writeFileSync(this.alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('❌ Could not save alerts:', error.message);
    }
  }

  analyzeCurrentBuild() {
    const distPath = path.resolve(__dirname, '../dist');
    
    if (!fs.existsSync(distPath)) {
      throw new Error('Build directory not found. Run "npm run build" first.');
    }

    const analysis = analyzeBundleFiles();
    
    return {
      timestamp: new Date().toISOString(),
      totalSize: analysis.totalSize,
      chunks: analysis.chunks,
      largestChunk: analysis.largeChunks[0] || null,
      categories: analysis.categories,
      chunkCount: analysis.chunks.length
    };
  }

  checkThresholds(analysis) {
    const alerts = [];
    const warnings = [];

    // Check total bundle size
    if (analysis.totalSize > this.thresholds.maxTotalSize) {
      alerts.push({
        type: 'CRITICAL',
        message: `Total bundle size (${formatBytes(analysis.totalSize)}) exceeds maximum (${formatBytes(this.thresholds.maxTotalSize)})`,
        threshold: this.thresholds.maxTotalSize,
        actual: analysis.totalSize
      });
    } else if (analysis.totalSize > this.thresholds.maxTotalSize * this.thresholds.warningThreshold) {
      warnings.push({
        type: 'WARNING',
        message: `Total bundle size (${formatBytes(analysis.totalSize)}) approaching maximum (${formatBytes(this.thresholds.maxTotalSize)})`,
        threshold: this.thresholds.maxTotalSize,
        actual: analysis.totalSize
      });
    }

    // Check individual chunk sizes
    analysis.chunks.forEach(chunk => {
      if (chunk.size > this.thresholds.maxChunkSize) {
        alerts.push({
          type: 'CRITICAL',
          message: `Chunk ${chunk.name} (${formatBytes(chunk.size)}) exceeds maximum chunk size (${formatBytes(this.thresholds.maxChunkSize)})`,
          threshold: this.thresholds.maxChunkSize,
          actual: chunk.size,
          chunk: chunk.name
        });
      } else if (chunk.size > this.thresholds.maxChunkSize * this.thresholds.warningThreshold) {
        warnings.push({
          type: 'WARNING',
          message: `Chunk ${chunk.name} (${formatBytes(chunk.size)}) approaching maximum size (${formatBytes(this.thresholds.maxChunkSize)})`,
          threshold: this.thresholds.maxChunkSize,
          actual: chunk.size,
          chunk: chunk.name
        });
      }
    });

    return { alerts, warnings };
  }

  calculateTrends(history) {
    if (history.length < 2) {
      return { trend: 'insufficient_data', change: 0, changePercent: 0 };
    }

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    const change = current.totalSize - previous.totalSize;
    const changePercent = (change / previous.totalSize) * 100;
    
    let trend = 'stable';
    if (Math.abs(changePercent) > 5) {
      trend = change > 0 ? 'increasing' : 'decreasing';
    }

    return { trend, change, changePercent };
  }

  generateDashboard() {
    console.log('📊 Bundle Monitoring Dashboard');
    console.log('==============================\n');

    try {
      // Analyze current build
      const analysis = this.analyzeCurrentBuild();
      
      // Load historical data
      const history = this.loadHistory();
      history.push(analysis);
      
      // Keep only last 30 entries
      if (history.length > 30) {
        history.splice(0, history.length - 30);
      }
      
      // Save updated history
      this.saveHistory(history);

      // Check thresholds and generate alerts
      const { alerts, warnings } = this.checkThresholds(analysis);
      
      // Calculate trends
      const trends = this.calculateTrends(history);

      // Display current status
      console.log('📈 Current Bundle Status:');
      console.log(`  Total Size: ${formatBytes(analysis.totalSize)}`);
      console.log(`  Chunk Count: ${analysis.chunkCount}`);
      console.log(`  Largest Chunk: ${analysis.largestChunk ? formatBytes(analysis.largestChunk.size) : 'N/A'}`);
      
      // Display trends
      if (trends.trend !== 'insufficient_data') {
        const trendIcon = trends.trend === 'increasing' ? '📈' : trends.trend === 'decreasing' ? '📉' : '➡️';
        const changeText = trends.change > 0 ? `+${formatBytes(trends.change)}` : formatBytes(trends.change);
        console.log(`  Trend: ${trendIcon} ${trends.trend.toUpperCase()} (${changeText}, ${trends.changePercent.toFixed(1)}%)`);
      }

      // Display alerts
      if (alerts.length > 0) {
        console.log('\n🚨 CRITICAL ALERTS:');
        alerts.forEach(alert => {
          console.log(`  ❌ ${alert.message}`);
        });
        
        // Save alerts
        const allAlerts = this.loadAlerts();
        allAlerts.push(...alerts.map(alert => ({
          ...alert,
          timestamp: analysis.timestamp
        })));
        this.saveAlerts(allAlerts);
      }

      if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warning => {
          console.log(`  ⚠️  ${warning.message}`);
        });
      }

      if (alerts.length === 0 && warnings.length === 0) {
        console.log('\n✅ All thresholds within acceptable limits');
      }

      // Display performance budget status
      console.log('\n💰 Performance Budget Status:');
      const budgetStatus = [
        {
          name: 'Max Chunk Size',
          limit: this.thresholds.maxChunkSize,
          current: analysis.largestChunk?.size || 0,
          status: (analysis.largestChunk?.size || 0) <= this.thresholds.maxChunkSize ? '✅' : '❌'
        },
        {
          name: 'Max Total Size',
          limit: this.thresholds.maxTotalSize,
          current: analysis.totalSize,
          status: analysis.totalSize <= this.thresholds.maxTotalSize ? '✅' : '❌'
        }
      ];

      budgetStatus.forEach(budget => {
        const usage = ((budget.current / budget.limit) * 100).toFixed(1);
        console.log(`  ${budget.status} ${budget.name}: ${formatBytes(budget.current)} / ${formatBytes(budget.limit)} (${usage}%)`);
      });

      // Display historical summary
      if (history.length > 1) {
        console.log('\n📊 Historical Summary (Last 7 builds):');
        const recentHistory = history.slice(-7);
        recentHistory.forEach((entry, index) => {
          const date = new Date(entry.timestamp).toLocaleDateString();
          const time = new Date(entry.timestamp).toLocaleTimeString();
          const isLatest = index === recentHistory.length - 1;
          const marker = isLatest ? '→' : ' ';
          console.log(`  ${marker} ${date} ${time}: ${formatBytes(entry.totalSize)} (${entry.chunkCount} chunks)`);
        });
      }

      // Display optimization recommendations
      if (alerts.length > 0 || warnings.length > 0) {
        console.log('\n💡 Optimization Recommendations:');
        if (analysis.largestChunk && analysis.largestChunk.size > this.thresholds.maxChunkSize) {
          console.log('  • Consider splitting large chunks with dynamic imports');
          console.log('  • Review vendor chunk grouping strategy');
        }
        if (analysis.totalSize > this.thresholds.maxTotalSize * 0.8) {
          console.log('  • Audit dependencies for unused code');
          console.log('  • Consider lazy loading for rarely used features');
        }
        console.log('  • Run component analysis: npm run analyze');
        console.log('  • Review bundle composition: npm run bundle:visual');
      }

      console.log('\n📋 Available Commands:');
      console.log('  npm run analyze          - Detailed bundle analysis');
      console.log('  npm run bundle:visual     - Visual bundle explorer');
      console.log('  npm run test:bundle       - Bundle size regression tests');
      console.log('  npm run test:optimization - Full optimization validation');

      console.log('\n✅ Bundle monitoring complete!');

      // Return status for programmatic use
      return {
        status: alerts.length > 0 ? 'CRITICAL' : warnings.length > 0 ? 'WARNING' : 'OK',
        analysis,
        alerts,
        warnings,
        trends
      };

    } catch (error) {
      console.error('❌ Bundle monitoring failed:', error.message);
      return { status: 'ERROR', error: error.message };
    }
  }

  // Method to set up alerts for CI/CD
  setupAlerts(options = {}) {
    const config = {
      maxChunkSize: options.maxChunkSize || this.thresholds.maxChunkSize,
      maxTotalSize: options.maxTotalSize || this.thresholds.maxTotalSize,
      failOnAlert: options.failOnAlert !== false, // Default to true
      ...options
    };

    const result = this.generateDashboard();
    
    if (config.failOnAlert && result.status === 'CRITICAL') {
      console.error('\n💥 Build failed due to critical bundle size alerts!');
      process.exit(1);
    }

    return result;
  }
}

// CLI interface
if (process.argv[1] && process.argv[1].endsWith('bundle-monitoring-dashboard.js')) {
  const monitor = new BundleMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'alert':
      monitor.setupAlerts({ failOnAlert: true });
      break;
    case 'check':
      monitor.setupAlerts({ failOnAlert: false });
      break;
    default:
      monitor.generateDashboard();
  }
}

export { BundleMonitor };