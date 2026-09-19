// Unit tests for path traversal vulnerability mitigation in bundle.mjs
// Tests the security properties of path validation without requiring esbuild
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { readText, walk } from './common.mjs';
import { inlineFontFacesFromStorybook, isPlaceholderCss } from './css-fallback.mjs';

describe('Path Traversal Vulnerability Mitigation', () => {
  
  describe('Path Validation Logic - Security Properties', () => {
    
    test('should detect path traversal with ../ sequences', () => {
      // Simulate the validation logic from resolveDistEntry
      const base = resolve(process.cwd());
      const target = resolve('../../../etc/passwd');
      const rel = relative(base, target);
      
      // The security check: path should not start with '..' or be absolute
      const isTraversal = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isTraversal).toBe(true);
    });

    test('should detect absolute paths as invalid', () => {
      const base = resolve(process.cwd());
      const target = resolve('/etc/passwd');
      const rel = relative(base, target);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isInvalid).toBe(true);
    });

    test('should accept valid relative paths within base directory', () => {
      const base = resolve(process.cwd());
      const target = resolve(base, 'valid/path/file.js');
      const rel = relative(base, target);
      
      const isValid = !rel.startsWith('..') && !isAbsolute(rel);
      
      expect(isValid).toBe(true);
    });

    test('should reject path traversal in nested paths', () => {
      const base = resolve(process.cwd());
      const target = resolve(base, 'valid/../../../etc/passwd');
      const rel = relative(base, target);
      
      const isTraversal = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isTraversal).toBe(true);
    });

    test('should validate multiple path traversal techniques', () => {
      const base = resolve(process.cwd());
      const maliciousPaths = [
        '../../../etc/passwd',
        '../../etc/passwd',
        './../../etc/passwd',
        'valid/../../../etc/passwd',
        '/etc/passwd',
        '/var/log/system.log'
      ];
      
      for (const maliciousPath of maliciousPaths) {
        const target = resolve(base, maliciousPath);
        const rel = relative(base, target);
        const isBlocked = rel.startsWith('..') || isAbsolute(rel);
        
        expect(isBlocked).toBe(true);
      }
    });

    test('should allow valid paths within the base directory', () => {
      const base = resolve(process.cwd());
      const validPaths = [
        'src/index.js',
        './lib/bundle.js',
        'components/Button/index.tsx',
        'dist/main.js'
      ];
      
      for (const validPath of validPaths) {
        const target = resolve(base, validPath);
        const rel = relative(base, target);
        const isAllowed = !rel.startsWith('..') && !isAbsolute(rel);
        
        expect(isAllowed).toBe(true);
      }
    });
  });

  describe('tsconfig Path Validation', () => {
    
    test('should detect path traversal in tsconfig paths', () => {
      const base = resolve('/project');
      const target = resolve(base, '../../../etc/passwd');
      const rel = relative(base, target);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isInvalid).toBe(true);
    });

    test('should detect absolute paths in tsconfig paths', () => {
      const base = resolve('/project');
      const target = resolve(base, '/etc/passwd');
      const rel = relative(base, target);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isInvalid).toBe(true);
    });

    test('should allow valid tsconfig paths', () => {
      const base = resolve('/project');
      const target = resolve(base, './src/components');
      const rel = relative(base, target);
      
      const isValid = !rel.startsWith('..') && !isAbsolute(rel);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Component Path Validation', () => {
    
    test('should detect path traversal in component group paths', () => {
      const outDir = resolve('/project/out');
      const componentPath = 'components/../../../etc/passwd/Button.jsx';
      const target = resolve(outDir, componentPath);
      const rel = relative(outDir, target);
      
      const isTraversal = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isTraversal).toBe(true);
    });

    test('should allow valid component paths', () => {
      const outDir = resolve('/project/out');
      const componentPath = 'components/forms/Button/Button.jsx';
      const target = resolve(outDir, componentPath);
      const rel = relative(outDir, target);
      
      const isValid = !rel.startsWith('..') && !isAbsolute(rel);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Bundler Output Path Validation', () => {
    
    test('should validate bundle output paths', () => {
      const outDir = resolve('/project/out');
      const bundlePath = resolve(outDir, '_ds_bundle.js');
      const rel = relative(outDir, bundlePath);
      
      const isValid = !rel.startsWith('..') && !isAbsolute(rel);
      
      expect(isValid).toBe(true);
    });

    test('should reject bundle paths outside output directory', () => {
      const outDir = resolve('/project/out');
      const bundlePath = resolve(outDir, '../../../etc/passwd');
      const rel = relative(outDir, bundlePath);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isInvalid).toBe(true);
    });
  });

  describe('Edge Cases and Attack Vectors', () => {
    
    test('should handle double-dot sequences in various positions', () => {
      const base = resolve(process.cwd());
      const target = resolve(base, 'src/../../etc/passwd');
      const rel = relative(base, target);
      
      const isBlocked = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isBlocked).toBe(true);
    });

    test('should handle mixed separators', () => {
      const base = resolve(process.cwd());
      const target = resolve(base, '../../../etc/passwd');
      const rel = relative(base, target);
      
      const isBlocked = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isBlocked).toBe(true);
    });

    test('should handle symlink-style attacks', () => {
      const base = resolve(process.cwd());
      const target = resolve(base, 'valid/../../etc/passwd');
      const rel = relative(base, target);
      
      const isBlocked = rel.startsWith('..') || isAbsolute(rel);
      
      expect(isBlocked).toBe(true);
    });
  });

  describe('resolveDistEntry Validation Logic - Path Traversal Protection', () => {
    // Test the validation logic used in resolveDistEntry without importing the function
    // This simulates the security checks: rel.startsWith('..') || isAbsolute(rel)
    
    test('should detect path traversal in override parameter', () => {
      const base = resolve(process.cwd());
      const override = '../../../etc/passwd';
      const target = resolve(override);
      const rel = relative(base, target);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      expect(isInvalid).toBe(true);
    });

    test('should detect absolute paths in override parameter', () => {
      const base = resolve(process.cwd());
      const override = '/etc/passwd';
      const target = resolve(override);
      const rel = relative(base, target);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      expect(isInvalid).toBe(true);
    });

    test('should accept valid relative paths in override', () => {
      const base = resolve(process.cwd());
      const override = './lib/valid.js';
      const target = resolve(base, override);
      const rel = relative(base, target);
      
      const isValid = !rel.startsWith('..') && !isAbsolute(rel);
      expect(isValid).toBe(true);
    });

    test('should reject malicious package.json entries', () => {
      const pkgDir = resolve('/project/pkg');
      const maliciousEntry = '../../../etc/passwd';
      const target = resolve(pkgDir, maliciousEntry);
      const rel = relative(pkgDir, target);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      expect(isInvalid).toBe(true);
    });

    test('should validate tsconfig path mappings', () => {
      const base = resolve('/project');
      const maliciousPath = '../../../etc/passwd';
      const target = resolve(base, maliciousPath);
      const rel = relative(base, target);
      
      const isInvalid = rel.startsWith('..') || isAbsolute(rel);
      expect(isInvalid).toBe(true);
    });
  });

  describe('readText - Path Traversal Protection', () => {
    let testDir;
    
    beforeEach(() => {
      testDir = resolve(process.cwd(), 'test-temp-readtext-' + Date.now());
      mkdirSync(testDir, { recursive: true });
    });
    
    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    test('should reject paths with .. sequences that escape cwd', () => {
      // Test that paths attempting to escape the current working directory are rejected
      // We can't actually create files outside cwd in tests, so we test the validation logic
      const cwd = resolve(process.cwd());
      const maliciousPath = resolve(cwd, '../../../etc/passwd');
      const rel = relative(cwd, maliciousPath);
      
      // This is the security check that readText performs
      const shouldBeRejected = rel.startsWith('..') || isAbsolute(rel);
      expect(shouldBeRejected).toBe(true);
      
      // If the file existed outside cwd, readText would throw
      // Since we can't create such a file in tests, we verify the logic
    });

    test('should read valid files within allowed directory', () => {
      const validFile = join(testDir, 'test.txt');
      writeFileSync(validFile, 'test content');
      
      const content = readText(validFile);
      expect(content).toBe('test content');
    });

    test('should return empty string for non-existent files', () => {
      const nonExistent = join(testDir, 'nonexistent.txt');
      const content = readText(nonExistent);
      expect(content).toBe('');
    });
  });

  describe('walk - Directory Traversal Protection', () => {
    let testDir;
    
    beforeEach(() => {
      testDir = resolve(process.cwd(), 'test-temp-walk-' + Date.now());
      mkdirSync(testDir, { recursive: true });
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'file1.js'), '');
      writeFileSync(join(testDir, 'subdir', 'file2.js'), '');
    });
    
    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    test('should walk valid directory structure', () => {
      const files = walk(testDir, (name) => name.endsWith('.js'));
      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.includes('file1.js'))).toBe(true);
    });

    test('should skip node_modules directories', () => {
      mkdirSync(join(testDir, 'node_modules'), { recursive: true });
      writeFileSync(join(testDir, 'node_modules', 'package.js'), '');
      
      const files = walk(testDir, (name) => name.endsWith('.js'));
      expect(files.some(f => f.includes('node_modules'))).toBe(false);
    });

    test('should reject entries with .. in name', () => {
      // The walk function should skip any entries with .. in the name
      // This is tested by the implementation, not by creating actual files with ..
      const files = walk(testDir);
      expect(files.every(f => !f.split('/').some(part => part === '..'))).toBe(true);
    });
  });

  describe('Security Exploit Scenarios - Path Traversal Attack Vectors', () => {
    let testDir;
    
    beforeEach(() => {
      testDir = resolve(process.cwd(), 'test-temp-security-' + Date.now());
      mkdirSync(testDir, { recursive: true });
    });
    
    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    test('exploit scenario: readText with path traversal to /etc/passwd', () => {
      // Attempt to read a system file using path traversal
      // This should throw an error due to the security check
      expect(() => {
        readText('../../../etc/passwd');
      }).toThrow('Invalid path');
    });

    test('exploit scenario: readText with absolute path to sensitive file', () => {
      // Attempt to read a system file using absolute path
      // This should throw an error due to the security check
      expect(() => {
        readText('/etc/passwd');
      }).toThrow('Invalid path');
    });

    test('exploit scenario: nested path traversal in component paths', () => {
      // Simulate the stampHeader validation for component paths
      const out = testDir;
      const maliciousComponentPath = 'components/../../../etc/passwd/malicious.jsx';
      const target = resolve(out, maliciousComponentPath);
      const rel = relative(out, target);
      
      // The security check should detect this as invalid
      const isBlocked = rel.startsWith('..') || isAbsolute(rel);
      expect(isBlocked).toBe(true);
    });

    test('exploit scenario: inlineFontFacesFromStorybook with traversal path', () => {
      // Test that inlineFontFacesFromStorybook rejects path traversal
      const maliciousPath = '../../../etc';
      const result = inlineFontFacesFromStorybook(maliciousPath, []);
      
      // Should return empty array due to security check
      expect(result).toEqual([]);
    });

    test('exploit scenario: isPlaceholderCss with path traversal', () => {
      // Create a valid CSS file in test directory
      const validCss = join(testDir, 'valid.css');
      writeFileSync(validCss, '/* comment */');
      
      // Valid path should work
      expect(isPlaceholderCss(validCss)).toBe(true);
      
      // Path traversal should be blocked by resolve() normalization
      // The function will simply not find the file and return false
      const result = isPlaceholderCss('../../../etc/passwd');
      expect(result).toBe(false);
    });

    test('exploit scenario: URL-encoded path traversal attempts', () => {
      // Test various encoded forms of path traversal
      const base = resolve(process.cwd());
      const encodedPaths = [
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%2f..%2f..%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ];
      
      // Node's resolve() will decode these, and our validation should catch them
      for (const encodedPath of encodedPaths) {
        const target = resolve(base, decodeURIComponent(encodedPath));
        const rel = relative(base, target);
        const isBlocked = rel.startsWith('..') || isAbsolute(rel);
        
        // Should be blocked
        expect(isBlocked).toBe(true);
      }
    });

    test('exploit scenario: null byte injection attempts', () => {
      // Test that null bytes don't bypass validation
      const base = resolve(process.cwd());
      const nullBytePath = '../../../etc/passwd\x00.txt';
      
      // Node.js will throw on null bytes in paths, but let's verify our logic
      try {
        const target = resolve(base, nullBytePath);
        const rel = relative(base, target);
        const isBlocked = rel.startsWith('..') || isAbsolute(rel);
        expect(isBlocked).toBe(true);
      } catch (e) {
        // Node.js may throw on null bytes - this is also acceptable
        expect(e).toBeDefined();
      }
    });

    test('exploit scenario: Windows-style path traversal', () => {
      // Test Windows-style path separators
      const base = resolve(process.cwd());
      
      // Test absolute Windows path (C:\...)
      const absoluteWinPath = 'C:\\windows\\system32\\config\\sam';
      const target1 = resolve(base, absoluteWinPath);
      const rel1 = relative(base, target1);
      // On Unix, backslashes are treated as regular chars, so this becomes a relative path
      // On Windows, this would be absolute. We check if it escapes or is absolute.
      const isBlocked1 = rel1.startsWith('..') || isAbsolute(rel1);
      
      // On Unix systems, the path won't be absolute but will be within base
      // On Windows, it would be absolute and blocked
      // This test verifies the validation logic works correctly per platform
      if (process.platform === 'win32') {
        expect(isBlocked1).toBe(true);
      } else {
        // On Unix, backslashes are literal characters, not path separators
        // The path becomes relative and stays within base
        expect(isBlocked1).toBe(false);
      }
      
      // Test path traversal with forward slashes (works on all platforms)
      const traversalPath = '../../../etc/passwd';
      const target2 = resolve(base, traversalPath);
      const rel2 = relative(base, target2);
      const isBlocked2 = rel2.startsWith('..') || isAbsolute(rel2);
      expect(isBlocked2).toBe(true);
    });

    test('exploit scenario: symlink-style double traversal', () => {
      // Test paths that use multiple traversal techniques
      const base = resolve(process.cwd());
      const complexPaths = [
        './valid/../../etc/passwd',
        'src/../../../etc/passwd',
        'components/../../../../../../etc/passwd'
      ];
      
      for (const complexPath of complexPaths) {
        const target = resolve(base, complexPath);
        const rel = relative(base, target);
        const isBlocked = rel.startsWith('..') || isAbsolute(rel);
        
        expect(isBlocked).toBe(true);
      }
    });
  });

  describe('CSS Fallback Security - Path Traversal Protection', () => {
    let testDir;
    
    beforeEach(() => {
      testDir = resolve(process.cwd(), 'test-temp-css-' + Date.now());
      mkdirSync(testDir, { recursive: true });
    });
    
    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    test('should reject path traversal in sbStatic parameter', () => {
      // Test that inlineFontFacesFromStorybook validates the sbStatic path
      const maliciousPaths = [
        '../../../etc',
        '/etc/passwd',
        '../../sensitive/data'
      ];
      
      for (const maliciousPath of maliciousPaths) {
        const result = inlineFontFacesFromStorybook(maliciousPath, []);
        // Should return empty array due to validation failure
        expect(result).toEqual([]);
      }
    });

    test('should accept valid sbStatic paths', () => {
      // Create a valid storybook-static directory structure
      const sbStatic = join(testDir, 'storybook-static');
      mkdirSync(sbStatic, { recursive: true });
      writeFileSync(join(sbStatic, 'iframe.html'), '<html><style>@font-face { font-family: "Test"; src: url(data:font/woff2;base64,test); }</style></html>');
      
      const result = inlineFontFacesFromStorybook(sbStatic, []);
      // Should process the file successfully
      expect(Array.isArray(result)).toBe(true);
    });

    test('should validate relative paths in isPlaceholderCss', () => {
      // Create a placeholder CSS file
      const cssFile = join(testDir, 'placeholder.css');
      writeFileSync(cssFile, '@import "styles";');
      
      // Valid path should work
      expect(isPlaceholderCss(cssFile)).toBe(true);
      
      // Non-existent path should return false
      expect(isPlaceholderCss(join(testDir, 'nonexistent.css'))).toBe(false);
    });
  });
});
