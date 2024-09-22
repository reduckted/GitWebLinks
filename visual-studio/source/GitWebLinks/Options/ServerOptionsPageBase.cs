#nullable enable

using Newtonsoft.Json;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.InteropServices;

namespace GitWebLinks;

[ComVisible(true)]
public abstract class ServerOptionsPageBase : OptionsPageBase {

    private List<ServerListItem> _servers = new();


    internal IReadOnlyList<StaticServer> GetServers() {
        return Servers.Select(
            (x) => new StaticServer(
                x.Http ?? "",
                string.IsNullOrEmpty(x.Ssh) ? null : x.Ssh,
                string.IsNullOrEmpty(x.Web) ? null : x.Web
            )
        ).ToList();
    }


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public List<ServerListItem> Servers {
        get => _servers;
        set {
            SetProperty(ref _servers, value ?? new List<ServerListItem>());
            OnPropertyChanged(nameof(JsonServers));
        }
    }


    [DefaultValue("[]")]
    public string JsonServers {
        get => SerializeServers(Servers);
        set => Servers = DeserializeServers(value);
    }


    protected static string SerializeServers(IEnumerable<ServerListItem> servers) {
        return JsonConvert.SerializeObject(
            servers.Select((x) => new ServerListItem {
                Http = x.Http ?? "",
                Ssh = x.Ssh,
                Web = x.Web
            })
        );
    }


    protected static List<ServerListItem> DeserializeServers(string? data) {
        if ((data is null) || (data.Length == 0)) {
            return new List<ServerListItem>();
        } else {
            return JsonConvert.DeserializeObject<IEnumerable<ServerListItem>>(data).ToList();
        }
    }

}
