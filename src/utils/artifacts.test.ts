import test from 'node:test';
import assert from 'node:assert/strict';
import { extractArtifacts, buildPreviewSrcDoc } from './artifacts';

test('extractArtifacts parses <antArtifact> tags', () => {
  const sampleResponse = `Here is a custom component:

<antArtifact identifier="interactive-card" type="application/vnd.ant.code" language="html" title="Interactive Pricing Card">
<div class="card">
  <h2>Pro Plan</h2>
  <button>Subscribe</button>
</div>
</antArtifact>

Let me know what you think!`;

  const { cleanedText, artifacts } = extractArtifacts(sampleResponse);

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].id, 'interactive-card');
  assert.equal(artifacts[0].title, 'Interactive Pricing Card');
  assert.equal(artifacts[0].language, 'html');
  assert.ok(artifacts[0].content.includes('<h2>Pro Plan</h2>'));
  assert.ok(cleanedText.includes('Interactive Pricing Card'));
});

test('buildPreviewSrcDoc wraps html with tailwind and proper doctype', () => {
  const artifact = {
    id: 'test-1',
    type: 'text/html' as const,
    language: 'html',
    title: 'Test Component',
    content: '<h1 class="text-xl">Hello World</h1>',
  };

  const srcDoc = buildPreviewSrcDoc(artifact);
  assert.ok(srcDoc.includes('<!DOCTYPE html>'));
  assert.ok(srcDoc.includes('tailwindcss'));
  assert.ok(srcDoc.includes('<h1 class="text-xl">Hello World</h1>'));
});
