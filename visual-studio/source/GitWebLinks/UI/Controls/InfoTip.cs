using System.Windows;
using System.Windows.Controls;

namespace GitWebLinks;

public class InfoTip : ContentControl {

    static InfoTip() {
        DefaultStyleKeyProperty.OverrideMetadata(
            typeof(InfoTip),
            new FrameworkPropertyMetadata(typeof(InfoTip))
        );
    }

}
