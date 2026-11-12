# The page calls these through window.AndroidBilling; R8 must not rename or drop them.
-keepclassmembers class com.nyrathen.tastyisland.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
