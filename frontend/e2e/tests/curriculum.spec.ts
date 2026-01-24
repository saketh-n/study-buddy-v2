import { test, expect } from '@playwright/test'

test.describe('Curriculum Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home first to check if any curriculum exists
    await page.goto('/')
    await page.waitForTimeout(500)
  })

  test('should display curriculum details when navigating to a curriculum', async ({ page }) => {
    // This test assumes a curriculum exists; skip if none
    const curriculumLink = page.getByTestId('curriculum-card').first()
    
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click()
      
      // Should show curriculum subject
      await expect(page.locator('h1')).toBeVisible()
      
      // Should show curriculum stats
      await expect(page.getByTestId('curriculum-stats')).toBeVisible()
    } else {
      test.skip(true, 'No saved curriculums exist; skipping Learning/Quiz flow E2E tests')
    }
  })

  test('should show topic list within clusters', async ({ page }) => {
    const curriculumLink = page.getByTestId('curriculum-card').first()
    
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click()
      await page.waitForTimeout(500)
      
      // Should have clickable topic buttons
      const topicButtons = page.locator('button').filter({ hasText: /lesson|ready|pending/i })
      await expect(topicButtons.first()).toBeVisible()
    } else {
      test.skip(true, 'No saved curriculums exist; skipping Learning/Quiz flow E2E tests')
    }
  })

  test('should show content status indicators', async ({ page }) => {
    const curriculumLink = page.getByTestId('curriculum-card').first()
    
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click()
      await page.waitForTimeout(500)
      
      // Should show content status (ready, generating, or pending)
      const statusText = page.locator('text=ready').or(
        page.locator('text=Generating').or(
          page.locator('text=Pending')
        )
      )
      await expect(statusText.first()).toBeVisible()
    } else {
      test.skip(true, 'No saved curriculums exist; skipping Learning/Quiz flow E2E tests')
    }
  })

  test('should have a Start Learning or Continue Learning button', async ({ page }) => {
    const curriculumLink = page.getByTestId('curriculum-card').first()
    
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click()
      await page.waitForTimeout(1000)
      
      // Should have a learning CTA button
      const learningButton = page.locator('button').filter({ 
        hasText: /start learning|continue learning|preparing/i 
      })
      await expect(learningButton).toBeVisible()
    } else {
      test.skip(true, 'No saved curriculums exist; skipping Learning/Quiz flow E2E tests')
    }
  })

  test('should have back navigation to home', async ({ page }) => {
    const curriculumLink = page.getByTestId('curriculum-card').first()
    
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click()
      await page.waitForTimeout(500)
      
      // Should have back button or link
      const backLink = page.locator('text=Back to Home').or(
        page.locator('a[href="/"]')
      )
      await expect(backLink.first()).toBeVisible()
    } else {
      test.skip(true, 'No saved curriculums exist; skipping Learning/Quiz flow E2E tests')
    }
  })
})

test.describe('Curriculum - 404 handling', () => {
  test('should show error for non-existent curriculum', async ({ page }) => {
    await page.goto('/curriculum/nonexistent-id')
    
    // Should show error or redirect
    await page.waitForTimeout(1000)
    
    const errorText = page.locator('text=not found').or(
      page.locator('text=error').or(
        page.locator('text=doesn\'t exist')
      )
    )
    
    // Either shows error or redirects to home
    const isError = await errorText.first().isVisible()
    const isHome = page.url().endsWith('/')
    
    expect(isError || isHome).toBeTruthy()
  })
})
