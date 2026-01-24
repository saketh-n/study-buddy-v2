import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should display the app title', async ({ page }) => {
    await page.goto('/')
    
    // Check for the main heading or brand
    await expect(page.locator('text=StudyBuddy')).toBeVisible()
  })

  test('should have a text input for curriculum', async ({ page }) => {
    await page.goto('/')
    
    // Look for the textarea or input for entering curriculum text
    const textInput = page.locator('textarea, input[type="text"]').first()
    await expect(textInput).toBeVisible()
  })

  test('should show saved curriculums section', async ({ page }) => {
    await page.goto('/')
    
    // The page should have a section for saved curriculums
    // This might be empty initially but the section should exist
    await expect(
      page.getByRole('heading', { name: 'Saved Curriculums' })
    ).toBeVisible();
  })

  test('should navigate when clicking on a saved curriculum', async ({ page }) => {
    await page.goto('/')
    
    // Wait for curriculums to load
    await page.waitForTimeout(1000)
    
    // If there's a curriculum, clicking it should navigate
    const curriculumCard = page.locator('[data-testid="curriculum-card"]').first()
    
    if (await curriculumCard.isVisible()) {
      await curriculumCard.click()
      
      // Should navigate to curriculum page
      await expect(page).toHaveURL(/\/curriculum\//)
    }
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Page should still be functional
    await expect(page.locator('text=StudyBuddy')).toBeVisible()
  })
})

test.describe('Home Page - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/curriculums**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname !== '/api/curriculums') return route.fallback();
      if (route.request().method() !== 'GET') return route.fallback();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ curriculums: [] }),
      });
    });
  });

  test.afterEach(async ({ page }) => {
    await page.unroute('**/api/curriculums**');
  });

  test('shows empty state when no curriculums exist', async ({ page }) => {
    const waitCurriculums = page.waitForResponse(r =>
      r.url().includes('/api/curriculums') && r.status() === 200
    );

    await page.goto('/');
    await waitCurriculums;

    await expect(
      page.getByText('No saved curriculums yet')
    ).toBeVisible();
  });
});
