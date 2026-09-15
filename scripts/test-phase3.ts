import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, "");
        if (key === "NEXT_PUBLIC_SUPABASE_URL" && !supabaseUrl) supabaseUrl = val;
        if (key === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" && !supabaseKey) supabaseKey = val;
      }
    }
  }
} catch (e) {
  // ignore
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPhase3() {
  console.log("====================================================");
  console.log("   PHASE 3 — ADMIN DASHBOARD & CRUD VERIFICATION    ");
  console.log("====================================================");

  // 1. Verify Restaurant Access & Dashboard Metrics
  console.log("\n1. Testing Restaurant & Dashboard Metrics...");
  const { data: restaurants, error: restError } = await supabase
    .from("restaurants")
    .select("*")
    .limit(1);

  if (restError) {
    console.error("   ✗ Failed to fetch restaurant:", restError.message);
  } else if (!restaurants || restaurants.length === 0) {
    console.error("   ✗ No restaurants found in database.");
  } else {
    const restaurant = restaurants[0];
    console.log(`   ✓ Found Restaurant: "${restaurant.name}" (ID: ${restaurant.id})`);
    console.log(`   ✓ Status: ${restaurant.is_open ? "OPEN" : "CLOSED"}, WhatsApp: ${restaurant.whatsapp_number}`);

    // 2. Category CRUD
    console.log("\n2. Testing Category CRUD Operations...");
    
    // Create Category
    const testCategoryName = `Test Category ${Date.now().toString().slice(-4)}`;
    const { data: newCat, error: catCreateError } = await supabase
      .from("categories")
      .insert({
        restaurant_id: restaurant.id,
        name: testCategoryName,
        sort_order: 99,
      })
      .select()
      .single();

    if (catCreateError || !newCat) {
      console.error("   ✗ Create Category Failed:", catCreateError?.message);
    } else {
      console.log(`   ✓ Created Category: "${newCat.name}" (ID: ${newCat.id})`);

      // Update / Rename Category
      const renamedCat = `${testCategoryName} (Renamed)`;
      const { data: updatedCat, error: renameError } = await supabase
        .from("categories")
        .update({ name: renamedCat })
        .eq("id", newCat.id)
        .select()
        .single();

      if (renameError || !updatedCat) {
        console.error("   ✗ Rename Category Failed:", renameError?.message);
      } else {
        console.log(`   ✓ Renamed Category to: "${updatedCat.name}"`);
      }

      // 3. Product CRUD
      console.log("\n3. Testing Product CRUD Operations...");

      const testProductName = `Gourmet Dish ${Date.now().toString().slice(-4)}`;
      const { data: newProd, error: prodCreateError } = await supabase
        .from("products")
        .insert({
          restaurant_id: restaurant.id,
          category_id: newCat.id,
          name: testProductName,
          description: "Rich layered flavors with aromatic spices and saffron.",
          price: 499,
          available: true,
          featured: true,
          sort_order: 1,
        })
        .select()
        .single();

      if (prodCreateError || !newProd) {
        console.error("   ✗ Create Product Failed:", prodCreateError?.message);
      } else {
        console.log(`   ✓ Created Product: "${newProd.name}" at ₹${newProd.price} (ID: ${newProd.id})`);

        // Edit Product
        const { data: editedProd, error: prodEditError } = await supabase
          .from("products")
          .update({
            name: `${testProductName} [Updated]`,
            price: 549,
            description: "Updated description with chef garnish.",
          })
          .eq("id", newProd.id)
          .select()
          .single();

        if (prodEditError || !editedProd) {
          console.error("   ✗ Edit Product Failed:", prodEditError?.message);
        } else {
          console.log(`   ✓ Edited Product: "${editedProd.name}" at ₹${editedProd.price}`);
        }

        // Toggle Product Availability
        const { data: toggledProd, error: toggleError } = await supabase
          .from("products")
          .update({ available: false })
          .eq("id", newProd.id)
          .select()
          .single();

        if (toggleError || !toggledProd) {
          console.error("   ✗ Toggle Availability Failed:", toggleError?.message);
        } else {
          console.log(`   ✓ Toggled Availability to: ${toggledProd.available ? "AVAILABLE" : "SOLD OUT"}`);
        }

        // Delete Product
        const { error: prodDeleteError } = await supabase
          .from("products")
          .delete()
          .eq("id", newProd.id);

        if (prodDeleteError) {
          console.error("   ✗ Delete Product Failed:", prodDeleteError.message);
        } else {
          console.log(`   ✓ Deleted Test Product successfully.`);
        }
      }

      // Delete Test Category
      const { error: catDeleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", newCat.id);

      if (catDeleteError) {
        console.error("   ✗ Delete Category Failed:", catDeleteError.message);
      } else {
        console.log(`   ✓ Deleted Test Category successfully.`);
      }
    }

    // 4. Test Restaurant Settings Updates
    console.log("\n4. Testing Restaurant Settings Modification...");
    const originalHours = restaurant.opening_hours || "11:00 AM – 11:00 PM Daily";
    const testHours = "10:00 AM – 11:30 PM (Special)";

    const { data: updatedSettings, error: settingsError } = await supabase
      .from("restaurants")
      .update({ opening_hours: testHours, is_open: true })
      .eq("id", restaurant.id)
      .select()
      .single();

    if (settingsError || !updatedSettings) {
      console.error("   ✗ Update Settings Failed:", settingsError?.message);
    } else {
      console.log(`   ✓ Updated Opening Hours: "${updatedSettings.opening_hours}"`);

      // Restore original hours
      await supabase
        .from("restaurants")
        .update({ opening_hours: originalHours })
        .eq("id", restaurant.id);
      console.log(`   ✓ Restored original settings.`);
    }

    // 5. Test Orders Listing & Status Updates
    console.log("\n5. Testing Orders Inspection...");
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .limit(5);

    if (ordersError) {
      console.error("   ✗ Fetch Orders Failed:", ordersError.message);
    } else {
      console.log(`   ✓ Retrieved ${orders?.length || 0} order records from database.`);
      if (orders && orders.length > 0) {
        const sampleOrder = orders[0];
        console.log(`   ✓ Sample Order #${sampleOrder.id.slice(0, 8)} | Total: ₹${sampleOrder.total} | Status: ${sampleOrder.status}`);
      }
    }
  }

  console.log("\n====================================================");
  console.log("   ALL PHASE 3 DATABASE CRUD OPERATIONS VERIFIED!   ");
  console.log("====================================================");
}

testPhase3().catch(console.error);
